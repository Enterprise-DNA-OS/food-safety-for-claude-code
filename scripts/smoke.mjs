import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {execute,reads,format} from './food.mjs';
import {parseCsv} from './lib/csv.mjs';
import {page,table as htmlTable} from './lib/render.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'food-test-'));
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const j=JSON.stringify;
let db,checks=0;
async function run(args){checks++;return execute(db,args);}
async function fails(args,pattern){checks++;await assert.rejects(()=>execute(db,args),pattern);}
const ago=hours=>new Date(Date.now()-hours*3600000).toISOString();
const base={site_id:uid(1),name:'Boundary food',kind:'cold',observed_at:ago(12),operator:'Test operator',retain_until:'2099-12-31'};
try{
 db=await getDb();
 if(process.env.TEST_DATABASE_URL)assert.equal((await db.query("select tablename from pg_tables where schemaname='public'")).length,0,'Postgres test requires an empty disposable database');
 await migrate(db);assert.equal((await migrate(db)).ran.length,0);
 const seed=fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8');await db.exec(seed);await db.exec(seed);
 assert.equal((await run(['sites'])).length,2);
 for(const command of Object.keys(reads))assert.ok(Array.isArray(await run([command])),command);
 assert.equal((await run(['attention'])).length,3);
 assert.equal((await run(['temperature-review'])).length,4);
 assert.equal((await run(['cooling-review']))[0].finding,'REVIEW cooling time');
 assert.equal((await run(['delivery-review']))[0].batch,'MILK-628');
 assert.equal(Number((await run(['supplier-review']))[0].held_or_rejected),1);
 assert.ok((await run(['training-review'])).some(r=>r.supervisor_review==='Certificate older than five years'));
 assert.ok((await run(['compliance'])).some(r=>r.rule==='AU-FSS'&&r.item==='Market Counter'));
 assert.ok((await run(['weekly-review'])).attention.length===3);
 assert.ok((await run(['help'])).fields.checks.includes('temperature_c'));
 assert.equal((await run(['record','staff','aLeX c'])).name,'Alex Chen');
 assert.equal((await run(['record','staff',uid(11)])).name,'Alex Chen');
 await fails(['record','staff','Alex'],/Ambiguous.*Alex Chen.*Alex Patel/);
 await fails(['record','staff','absent'],/No match/);
 await fails(['record','staff',''],/required/);
 await fails(['add','sites',j({name:'Bad',timezone:'not-a-zone'})],/timezone/);
 await fails(['add','staff',j({name:'Date test',site_id:uid(1),trained_on:'2026-02-30'})],/real YYYY/);
 await fails(['log',j({...base,observed_at:'2026-02-30T12:00:00Z'})],/invalid date/);
 await fails(['log',j({...base,observed_at:'2099-01-01T12:00:00Z'})],/future/);
 await fails(['log',j({...base,observed_at:'2026-09-28 12:00'})],/timezone/);
 await fails(['log',j({...base,temperature_c:'5'})],/number/);
 await fails(['log',j({...base,temperature_c:201})],/check constraint/);
 await fails(['log',j({...base,equipment_id:uid(32)})],/different site/);
 await fails(['add','actions',j({site_id:uid(2),check_id:uid(41),name:'Wrong site',owner:'Test',due_at:ago(1)})],/different site/);
 await fails(['add','sites',j({name:'Unknown field',bogus:'x'})],/Unknown field/);
 await fails(['update','checks',uid(41),j({temperature_c:4})],/append-only/);
 await fails(['update','deliveries',uid(61),j({state:'accepted'})],/append-only/);
 const supplier=await run(['add','suppliers',j({name:'<script>test</script>',contact:'test@example.test'})]);
 const updated=await run(['update','suppliers',supplier.id,j({contact:'new@example.test'})]);assert.equal(updated.contact,'new@example.test');
 const trail=(await run(['audit'])).filter(r=>r.record_id===supplier.id);assert.equal(trail.length,2);assert.equal(trail.find(r=>r.operation==='UPDATE').before_record.contact,'test@example.test');
 for(const [kind,value,finding] of [['cold',5,'Within recorded default limits'],['cold',5.01,'REVIEW cold above 5C'],['hot',60,'Within recorded default limits'],['hot',59.99,'REVIEW hot below 60C'],['cold',null,'MISSING measurement']]){
  const row=await run(['log',j({...base,name:`Boundary ${kind} ${value}`,kind,temperature_c:value})]);
  assert.equal((await db.query('select finding from v_temperature_review where id=$1',[row.id]))[0].finding,finding);
 }
 const start=new Date(Date.now()-24*3600000),at=n=>new Date(start.getTime()+n*3600000).toISOString();
 for(const [second,third,finding] of [[2,6,'Within recorded default limits'],[2.01,6,'REVIEW cooling time'],[2,6.01,'REVIEW cooling time'],[null,null,'MISSING cooling checkpoint']]){
  const row=await run(['log',j({...base,name:`Cooling ${second} ${third}`,kind:'cooling',temperature_c:60,observed_at:at(0),cooled_21_at:second===null?null:at(second),cooled_5_at:third===null?null:at(third)})]);
  assert.equal((await db.query('select finding from v_temperature_review where id=$1',[row.id]))[0].finding,finding);
 }
 await fails(['log',j({...base,kind:'cooling',cooled_21_at:ago(14)})],/check constraint/);
 const retain=await run(['log',j({...base,name:'Retention test',temperature_c:4,retain_until:'2020-01-01'})]);
 assert.ok((await db.query('select * from v_compliance where id=$1',[retain.id])).some(r=>r.rule==='AU-RETAIN'));
 await fails(['close-action',uid(71),'Fixed',''],/resolution/);
 await fails(['update','actions',uid(71),j({closed_at:ago(1)})],/close-action/);
 const closed=await run(['close-action',uid(71),'Supervisor reviewed and recorded disposition','archive/action71.pdf']);assert.ok(closed.closed_at);
 await fails(['close-action',uid(71),'Again','archive/a.pdf'],/already closed/);
 await fails(['update','actions',uid(71),j({name:'Hide original'})],/immutable/);
 assert.ok((await run(['temperature-review'])).some(r=>r.food==='Milk sample'&&r.finding==='REVIEW cold above 5C'));
 await fails(['update','cleaning',uid(51),j({completed_at:ago(1),operator:'Mia Singh'})],/check constraint/);
 await run(['update','cleaning',uid(51),j({completed_at:ago(1),operator:'Mia Singh',method:'Recorded sanitiser dilution and contact time',evidence_ref:'archive/bench.pdf'})]);
 await fails(['update','cleaning',uid(51),j({method:'Rewritten'})],/immutable/);
 const imp=path.join(temp,'import');fs.mkdirSync(imp);
 const mapping={files:[{file:'suppliers.csv',entity:'suppliers',key:'Supplier ID',columns:{'Supplier Name':'name',Contact:'contact'}}]};
 const original='Supplier ID,Supplier Name,Contact\r\nSFP-A,"Imported, Supplier",one@example.test\r\n';
 const set=(csv,m=mapping)=>{fs.writeFileSync(path.join(imp,'suppliers.csv'),csv);fs.writeFileSync(path.join(imp,'mapping.json'),j(m));};
 set(original);const count=(await run(['suppliers'])).length,auditCount=(await run(['audit'])).length;
 assert.equal((await run(['import','safe-food-pro',imp,'--dry-run'])).inserted,1);assert.equal((await run(['suppliers'])).length,count);assert.equal((await run(['audit'])).length,auditCount);
 assert.equal((await run(['import','safe-food-pro',imp])).inserted,1);assert.equal((await run(['import','safe-food-pro',imp])).skipped,1);
 set(original.replace('one@example','changed@example'));await fails(['import','safe-food-pro',imp],/Changed source record/);
 set('Supplier ID,Supplier Name,Contact,Unknown\nNEW,Good,ok@example.test,extra\n');await fails(['import','safe-food-pro',imp],/Unmapped/);
 set('Supplier ID,Supplier Name,Contact\nGOOD,Good,ok@example.test\nBAD,,missing@example.test\n');await fails(['import','safe-food-pro',imp],/not-null|check constraint/);assert.equal((await run(['suppliers'])).length,count+1);
 set(original,{files:[{...mapping.files[0],columns:{'Supplier Name':'name',Contact:'name'}}]});await fails(['import','safe-food-pro',imp],/Duplicate mapped/);
 set('Supplier ID,Supplier Name,Contact\n');await fails(['import','safe-food-pro',imp],/No data rows/);
 assert.deepEqual(parseCsv('\ufeffName,Note\r\n"A","line 1\nline ""2"""\r\n'),[{Name:'A',Note:'line 1\nline "2"'}]);
 assert.throws(()=>parseCsv('a,A\n1,2'),/unique/);assert.throws(()=>parseCsv('a,b\n"bad,b'),/unclosed/);assert.throws(()=>parseCsv('a,b\n1'),/expected/);
 const snapshot=await run(['export',path.join(temp,'export')]);const out=JSON.parse(fs.readFileSync(snapshot.file,'utf8'));assert.ok(out.records.audit_log.length>0);assert.equal(out.records.import_records.length,1);
 await fails(['export',path.join(temp,'export')],/must not exist/);
 for(const command of ['draft-inspection','draft-corrective']){const draft=await run([command,'Harbour']);assert.ok(fs.existsSync(draft.file));assert.match(fs.readFileSync(draft.file,'utf8'),/DRAFT/);}
 assert.ok(!page({title:'<script>',sections:[{title:'Rows',html:htmlTable([{name:'<script>alert(1)</script>'}])}]}).includes('<script>'));
 assert.match(format([{temperature_c:5}]),/temperature c/);
 await fails(['unknown'],/Unknown command/);
 await fails(['sites','junk'],/no arguments/);
 await db.close();db=null;
 for(const file of ['view.mjs','docs.mjs']){const p=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',file)],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,0,p.stderr);checks++;}
 assert.equal(fs.readdirSync(path.join(temp,'views')).length,3);
 assert.equal(fs.readdirSync(path.join(temp,'docs-out','inspection-pack')).length,2);
 const proc=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts/food.mjs'),'record','staff','Alex','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(proc.status,1);assert.match(JSON.parse(proc.stdout).error,/Ambiguous/);
 console.log(`PASS: ${checks} command checks; 31 slash commands; ${process.env.TEST_DATABASE_URL?'Postgres':'PGlite'}; import rollback, boundary rules, audit and documents`);
}finally{if(db)await db.close();fs.rmSync(temp,{recursive:true,force:true});}
