#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {fields} from './lib/model.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {page,table as htmlTable,writeOut} from './lib/render.mjs';

export const reads={
 ...Object.fromEntries(Object.keys(fields).map(t=>[t,`select * from ${t} order by name,id`])),
 'opening-checks':'select site,equipment,kind,last_check,finding from v_opening order by site,equipment',
 'temperature-review':'select site,food,kind,temperature_c,finding,operator from v_temperature_review order by observed_at desc,food',
 'cooling-review':"select site,food,finding,operator from v_temperature_review where kind='cooling' order by food",
 'cleaning-due':"select site,item,owner,due_at from v_attention where kind='Cleaning' order by due_at",
 'delivery-review':"select s.name as site,d.name,d.batch,p.name as supplier,d.temperature_c,d.state,d.operator from deliveries d join sites s on s.id=d.site_id join suppliers p on p.id=d.supplier_id where d.state in ('held','rejected') order by received_at",
 'supplier-review':'select * from v_supplier_review order by held_or_rejected desc,name',
 'training-review':'select site,name,training,supervisor_review from v_training order by site,name',
 attention:'select site,kind,item,owner,due_at from v_attention order by due_at',
 compliance:'select rule,item,finding from v_compliance order by rule,item',
 retention:"select name,observed_at,retain_until,(greatest(created_at,updated_at,observed_at)+interval '3 months')::date as review_floor from checks order by retain_until",
 audit:'select * from audit_log order by occurred_at,id'
};
function validate(entity,data){
 if(!fields[entity])throw Error(`Unknown entity ${entity}`);
 if(!data||Array.isArray(data)||typeof data!=='object'||!Object.keys(data).length)throw Error('Provide a nonempty JSON object');
 for(const [key,value] of Object.entries(data)){
  if(!fields[entity].includes(key))throw Error(`Unknown field ${entity}.${key}`);
  if(value===null)continue;
  if(['active','supervisor','available'].includes(key)){if(typeof value!=='boolean')throw Error(`${key} must be a boolean`);continue;}
  if(key==='temperature_c'){if(typeof value!=='number'||!Number.isFinite(value))throw Error('temperature_c must be a number');continue;}
  if(typeof value!=='string')throw Error(`${key} must be text`);
  if(key.endsWith('_id')&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw Error(`${key} requires a full UUID`);
  if(key.endsWith('_date')||['trained_on','approval_due','calibration_due','retain_until'].includes(key)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Error(`${key} requires a real YYYY-MM-DD date`);
  }
  if(key.endsWith('_at')){
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(value)||Number.isNaN(Date.parse(value)))throw Error(`${key} requires an ISO timestamp with timezone`);
   const date=value.slice(0,10);if(new Date(date).toISOString().slice(0,10)!==date)throw Error(`${key} has an invalid date`);
  }
  if(['observed_at','received_at','completed_at','closed_at','cooled_21_at','cooled_5_at'].includes(key)&&Date.parse(value)>Date.now())throw Error(`${key} cannot be a future observation`);
  if(['trained_on','certificate_date'].includes(key)&&value>new Date().toISOString().slice(0,10))throw Error(`${key} cannot be a future date`);
  if(key==='timezone'){try{new Intl.DateTimeFormat('en',{timeZone:value});}catch{throw Error('Invalid site timezone');}}
 }
}
async function resolve(db,entity,query){
 if(!fields[entity])throw Error(`Unknown entity ${entity}`);
 if(!query?.trim())throw Error('A name or id prefix is required');
 const rows=await db.query(`select * from ${entity} where lower(name)=lower($1) or left(id::text,length($1))=lower($1) order by name,id`,[query]);
 const matches=rows.length?rows:await db.query(`select * from ${entity} where position(lower($1) in lower(name))>0 order by name,id`,[query]);
 if(matches.length!==1)throw Error(matches.length?`Ambiguous ${entity}: ${matches.map(r=>`${r.name} (${r.id})`).join(', ')}`:`No match in ${entity}: ${query}`);
 return matches[0];
}
async function insert(db,entity,data){
 validate(entity,data);const keys=Object.keys(data);
 return (await db.query(`insert into ${entity} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data)))[0];
}
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical=row=>Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)));

// A manifest maps each real export heading to a domain field. No guessed facts or silent drops.
async function importCsv(db,args){
 const [source,folder,...opts]=args;
 if(source!=='safe-food-pro'||!folder)throw Error('import safe-food-pro <folder> [--dry-run]');
 if(opts.some(v=>v!=='--dry-run'))throw Error('Unknown import option');
 const dir=path.resolve(folder), manifest=JSON.parse(fs.readFileSync(path.join(dir,'mapping.json'),'utf8'));
 if(!Array.isArray(manifest.files)||!manifest.files.length)throw Error('mapping.json requires files');
 let inserted=0,skipped=0;const entities={};
 await db.exec('BEGIN');
 try{
  for(const spec of manifest.files){
   if(!fields[spec.entity]||!spec.columns||!spec.file)throw Error('Each file requires entity, file and columns');
   const mapped=Object.values(spec.columns).filter(v=>v!==null);
   if(new Set(mapped).size!==mapped.length)throw Error('Duplicate mapped destination field');
   const file=path.resolve(dir,spec.file);if(!file.startsWith(dir+path.sep))throw Error('CSV must be inside import folder');
   const records=parseCsv(fs.readFileSync(file,'utf8'));
   if(!records.length)throw Error(`No data rows in ${spec.file}`);
   for(const raw of records){
    const data={...(spec.defaults||{})};
    for(const [header,value] of Object.entries(raw)){
     if(header===spec.key)continue;
     if(!Object.hasOwn(spec.columns,header))throw Error(`Unmapped column ${spec.file}: ${header}`);
     const field=spec.columns[header];if(field===null)continue;
     if(!fields[spec.entity].includes(field))throw Error(`Unknown mapped field ${field}`);
     if(value===''){if(!(field in data))data[field]=null;continue;}
     if(['active','supervisor','available'].includes(field)){
      if(!/^(true|false|yes|no|1|0)$/i.test(value))throw Error(`Invalid boolean ${header}`);
      data[field]=/^(true|yes|1)$/i.test(value);
     }else if(field==='temperature_c'){
      if(!/^-?\d+(\.\d+)?$/.test(value))throw Error(`Invalid number ${header}`);
      data[field]=Number(value);
     }else data[field]=value;
    }
    // Resolve only explicit relationship mappings. A duplicate name must stop for review.
    for(const [field,entity] of Object.entries(spec.resolve||{}))if(data[field]){
     const expected={site_id:'sites',equipment_id:'equipment',supplier_id:'suppliers',check_id:'checks'};
     if(expected[field]!==entity)throw Error(`Invalid relationship mapping ${field}`);
     data[field]=(await resolve(db,entity,data[field])).id;
    }
    validate(spec.entity,data);
    const rawSorted=canonical(raw), fingerprint=hash({raw:rawSorted,data:canonical(data)});
    if(spec.key&&!raw[spec.key]?.trim())throw Error(`Missing source key ${spec.key}`);
    const sourceKey=spec.key?raw[spec.key]:hash(rawSorted);
    const old=await db.query('select * from import_records where source=$1 and entity=$2 and source_key=$3',[source,spec.entity,sourceKey]);
    if(old.length){if(old[0].fingerprint!==fingerprint)throw Error(`Changed source record ${sourceKey}: reconcile before importing`);skipped++;continue;}
    const result=await insert(db,spec.entity,data);
    await db.query('insert into import_records(source,entity,source_key,record_id,fingerprint,raw_record) values($1,$2,$3,$4,$5,$6)',[source,spec.entity,sourceKey,result.id,fingerprint,JSON.stringify(raw)]);
    inserted++;entities[spec.entity]=(entities[spec.entity]||0)+1;
   }
  }
  await db.exec(opts.includes('--dry-run')?'ROLLBACK':'COMMIT');
  return {inserted,skipped,entities,dry_run:opts.includes('--dry-run')};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export async function execute(db,args){
 const [cmd='help',...rest]=args;
 if(cmd==='help'||cmd==='--help')return {reads:Object.keys(reads),writes:['add <entity> <json>','update <entity> <id-or-name> <json>','log <check-json>','close-action <id-or-name> <resolution> <evidence-ref>'],other:['record <entity> <id-or-name>','weekly-review','draft-inspection <site>','draft-corrective <site>','import safe-food-pro <folder> [--dry-run]','export <new-folder>'],fields};
 if(reads[cmd]){if(rest.length)throw Error(`${cmd} takes no arguments`);return db.query(reads[cmd]);}
 if(cmd==='weekly-review'){
  const out={};for(const name of ['opening-checks','attention','temperature-review','training-review','compliance'])out[name]=await db.query(reads[name]);return out;
 }
 if(cmd==='record'){if(rest.length!==2)throw Error('record <entity> <id-or-name>');return resolve(db,rest[0],rest[1]);}
 if(cmd==='add'){if(rest.length!==2)throw Error('add <entity> <json>');return insert(db,rest[0],JSON.parse(rest[1]));}
 if(cmd==='log'){if(rest.length!==1)throw Error('log <check-json>');return insert(db,'checks',JSON.parse(rest[0]));}
 if(cmd==='update'){
  if(rest.length!==3)throw Error('update <entity> <id-or-name> <json>');
  const [entity,query,json]=rest;
  if(['checks','deliveries'].includes(entity))throw Error('Observed checks and deliveries are append-only; add a linked corrective action');
  const data=JSON.parse(json);validate(entity,data);
  const record=await resolve(db,entity,query);
  if(entity==='actions'&&('closed_at' in data||'resolution' in data))throw Error('Use close-action with resolution and evidence');
  if(entity==='actions'&&record.closed_at)throw Error('Closed actions are immutable; add a follow-up action');
  if(entity==='cleaning'&&record.completed_at)throw Error('Completed cleaning is immutable; add a follow-up record');
  const keys=Object.keys(data);
  return (await db.query(`update ${entity} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(data),record.id]))[0];
 }
 if(cmd==='close-action'){
  if(rest.length!==3||!rest[1].trim()||!rest[2].trim())throw Error('close-action <action> <resolution> <evidence-ref>');
  const a=await resolve(db,'actions',rest[0]);if(a.closed_at)throw Error('Action already closed');
  const rows=await db.query('update actions set closed_at=now(),resolution=$1,evidence_ref=$2 where id=$3 and closed_at is null returning *',[rest[1],rest[2],a.id]);
  if(!rows.length)throw Error('Action already closed');return rows[0];
 }
 if(cmd==='import')return importCsv(db,rest);
 if(cmd==='export'){
  if(rest.length!==1)throw Error('export <new-folder>');
  const dir=path.resolve(rest[0]);if(fs.existsSync(dir))throw Error('Export folder must not exist');
  const snapshot={format:'food-safety-v1',exported_at:new Date().toISOString(),records:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try{for(const entity of [...Object.keys(fields),'audit_log','import_records','schema_migrations'])snapshot.records[entity]=await db.query(`select * from ${entity}`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'records.json'),JSON.stringify(snapshot,null,2));
  return {file:path.join(dir,'records.json'),counts:Object.fromEntries(Object.entries(snapshot.records).map(([k,v])=>[k,v.length]))};
 }
 if(['draft-inspection','draft-corrective'].includes(cmd)){
  if(rest.length!==1)throw Error(`${cmd} <site>`);const s=await resolve(db,'sites',rest[0]);
  const sections=[];
  const queries=cmd==='draft-inspection'?[
   ['Temperature review','select * from v_temperature_review where site_id=$1'],['Training review','select * from v_training where site_id=$1'],['Record checks','select * from v_compliance where site_id=$1']
  ]:[['Open corrective actions','select name,owner,due_at from actions where site_id=$1 and closed_at is null'],['Unfinished cleaning','select name,due_at from cleaning where site_id=$1 and completed_at is null']];
  for(const [title,sql] of queries)sections.push({title,html:htmlTable(await db.query(sql,[s.id]))});
  const file=writeOut('drafts',`${cmd}-${s.id}-${randomUUID()}`,page({title:`DRAFT: ${cmd==='draft-inspection'?'Inspection record pack':'Corrective action follow-up'}`,subtitle:s.name+' | Record review only. An authorised person reviews before sharing.',sections}));
  return {file,status:'draft, not sent'};
 }
 throw Error(`Unknown command ${cmd}. Run help.`);
}
export function format(value){
 if(Array.isArray(value))return table(value,Object.keys(value[0]||{}).map(k=>({key:k,label:k.replaceAll('_',' '),width:85,format:v=>v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v})));
 if(value&&typeof value==='object'&&Object.values(value).some(Array.isArray))return Object.entries(value).map(([k,v])=>`${k}\n${Array.isArray(v)?format(v):JSON.stringify(v,null,2)}`).join('\n\n');
 return JSON.stringify(value,null,2);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const json=process.argv.includes('--json');let db;
 try{db=await getDb();const result=await execute(db,process.argv.slice(2).filter(a=>a!=='--json'));console.log(json?JSON.stringify(result):format(result));}
 catch(e){if(json)console.log(JSON.stringify({error:e.message}));else console.error(e.message);process.exitCode=1;}
 finally{if(db)await db.close();}
}
