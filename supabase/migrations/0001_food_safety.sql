create table sites (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(length(trim(name))>0), category text not null default 'unknown' check(category in ('1','2','unknown')), timezone text not null default 'Australia/Sydney', active boolean not null default true);
create table staff (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), site_id uuid not null references sites, name text not null check(length(trim(name))>0), role text not null default 'Food handler', active boolean not null default true, trained_on date, training_ref text, supervisor boolean not null default false, certificate_date date, certificate_ref text, available boolean not null default false);
create table suppliers (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null check(length(trim(name))>0), contact text, approval_due date, evidence_ref text);
create table equipment (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), site_id uuid not null references sites, name text not null check(length(trim(name))>0), kind text not null default 'other' check(kind in ('chiller','hot-hold','probe','other')), calibration_due date, active boolean not null default true);
create table checks (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), site_id uuid not null references sites, equipment_id uuid references equipment, name text not null check(length(trim(name))>0), kind text not null check(kind in ('cold','hot','cooling','cooking','processing','transport')), observed_at timestamptz not null, operator text not null check(length(trim(operator))>0), temperature_c numeric check(temperature_c between -100 and 200), cooled_21_at timestamptz, cooled_5_at timestamptz, evidence_ref text, notes text, retain_until date not null, check(cooled_21_at is null or cooled_21_at>=observed_at), check(cooled_5_at is null or (cooled_21_at is not null and cooled_5_at>=cooled_21_at)));
create table cleaning (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), site_id uuid not null references sites, name text not null check(length(trim(name))>0), due_at timestamptz not null, completed_at timestamptz, operator text, method text, evidence_ref text, check(completed_at is null or (length(trim(operator))>0 and length(trim(method))>0 and operator is not null and method is not null)));
create table deliveries (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), site_id uuid not null references sites, supplier_id uuid not null references suppliers, name text not null check(length(trim(name))>0), batch text not null check(length(trim(batch))>0), received_at timestamptz not null, temperature_c numeric check(temperature_c between -100 and 200), state text not null check(state in ('accepted','rejected','held')), operator text not null check(length(trim(operator))>0), evidence_ref text, notes text);
create table actions (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), site_id uuid not null references sites, check_id uuid references checks, name text not null check(length(trim(name))>0), owner text not null check(length(trim(owner))>0), due_at timestamptz not null, closed_at timestamptz, resolution text, evidence_ref text, check(closed_at is null or (resolution is not null and length(trim(resolution))>0 and evidence_ref is not null and length(trim(evidence_ref))>0)));
create table audit_log (id uuid primary key default gen_random_uuid(), occurred_at timestamptz not null default now(), entity text not null, record_id uuid not null, operation text not null, before_record jsonb, after_record jsonb);
create table import_records (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), source text not null, entity text not null, source_key text not null, record_id uuid not null, fingerprint text not null, raw_record jsonb not null, unique(source,entity,source_key));
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create function audit_change() returns trigger language plpgsql as $$ begin
 insert into audit_log(entity,record_id,operation,before_record,after_record) values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,case when TG_OP='INSERT' then null else to_jsonb(old) end,case when TG_OP='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old); end $$;
create function check_same_site() returns trigger language plpgsql as $$ begin
 if TG_TABLE_NAME='checks' then
 if new.equipment_id is not null then
  if not exists(select 1 from equipment where id=new.equipment_id and site_id=new.site_id) then raise exception 'Equipment belongs to a different site'; end if;
 end if;
 elsif TG_TABLE_NAME='actions' then
 if new.check_id is not null then
  if not exists(select 1 from checks where id=new.check_id and site_id=new.site_id) then raise exception 'Check belongs to a different site'; end if;
 end if;
 end if;
 return new; end $$;
create trigger checks_site before insert or update on checks for each row execute function check_same_site();
create trigger actions_site before insert or update on actions for each row execute function check_same_site();
create trigger sites_touch before update on sites for each row execute function touch_updated();
create trigger sites_audit after insert or update or delete on sites for each row execute function audit_change();
create trigger staff_touch before update on staff for each row execute function touch_updated();
create trigger staff_audit after insert or update or delete on staff for each row execute function audit_change();
create trigger suppliers_touch before update on suppliers for each row execute function touch_updated();
create trigger suppliers_audit after insert or update or delete on suppliers for each row execute function audit_change();
create trigger equipment_touch before update on equipment for each row execute function touch_updated();
create trigger equipment_audit after insert or update or delete on equipment for each row execute function audit_change();
create trigger checks_touch before update on checks for each row execute function touch_updated();
create trigger checks_audit after insert or update or delete on checks for each row execute function audit_change();
create trigger cleaning_touch before update on cleaning for each row execute function touch_updated();
create trigger cleaning_audit after insert or update or delete on cleaning for each row execute function audit_change();
create trigger deliveries_touch before update on deliveries for each row execute function touch_updated();
create trigger deliveries_audit after insert or update or delete on deliveries for each row execute function audit_change();
create trigger actions_touch before update on actions for each row execute function touch_updated();
create trigger actions_audit after insert or update or delete on actions for each row execute function audit_change();

create view v_temperature_review as
select c.id,c.site_id,s.name as site,c.name as food,c.kind,c.observed_at,c.temperature_c,
 case
 when c.kind in ('cold','hot') and c.temperature_c is null then 'MISSING measurement'
 when c.kind='cold' and c.temperature_c>5 then 'REVIEW cold above 5C'
 when c.kind='hot' and c.temperature_c<60 then 'REVIEW hot below 60C'
 when c.kind='cooling' and (c.cooled_21_at is null or c.cooled_5_at is null) then 'MISSING cooling checkpoint'
 when c.kind='cooling' and (c.cooled_21_at>c.observed_at+interval '2 hours' or c.cooled_5_at>c.cooled_21_at+interval '4 hours') then 'REVIEW cooling time'
 when c.kind in ('cooking','processing','transport') then 'REVIEW against approved method'
 else 'Within recorded default limits' end as finding,
 c.operator,c.retain_until from checks c join sites s on s.id=c.site_id;
create view v_opening as
select e.id,e.site_id,s.name as site,e.name as equipment,e.kind,
 (select max(c.observed_at) from checks c where c.equipment_id=e.id) as last_check,
 case when exists(select 1 from checks c where c.equipment_id=e.id and (c.observed_at at time zone s.timezone)::date=(now() at time zone s.timezone)::date) then 'Recorded today' else 'No check today' end as finding
from equipment e join sites s on s.id=e.site_id where e.active and s.active and e.kind in ('chiller','hot-hold');
create view v_attention as
select a.id,a.site_id,s.name as site,'Corrective action'::text as kind,a.name as item,a.owner,a.due_at from actions a join sites s on s.id=a.site_id where a.closed_at is null and a.due_at<now()
union all select c.id,c.site_id,s.name,'Cleaning',c.name,coalesce(c.operator,'Unassigned'),c.due_at from cleaning c join sites s on s.id=c.site_id where c.completed_at is null and c.due_at<now();
create view v_training as
select f.id,f.site_id,s.name as site,f.name,f.role,f.trained_on,f.supervisor,f.certificate_date,
 case when f.trained_on is null or nullif(trim(f.training_ref),'') is null then 'Training evidence missing' else 'Training recorded' end as training,
 case when not f.supervisor then 'Not appointed' when f.certificate_date is null or nullif(trim(f.certificate_ref),'') is null then 'Certificate evidence missing'
 when f.certificate_date>current_date then 'Certificate future dated'
 when f.certificate_date<=current_date-interval '5 years' then 'Certificate older than five years'
 when not f.available then 'Availability not confirmed' else 'Certificate and availability recorded' end as supervisor_review
from staff f join sites s on s.id=f.site_id where f.active;
create view v_supplier_review as
select s.id,s.name,s.approval_due,count(d.id) as deliveries,count(d.id) filter(where d.state in ('held','rejected')) as held_or_rejected
from suppliers s left join deliveries d on d.supplier_id=s.id group by s.id;
create view v_compliance as
select c.id,c.site_id,'AU-TEMP'::text as rule,c.food as item,c.finding as finding from v_temperature_review c where c.finding <> 'Within recorded default limits'
union all select s.id,s.id,'AU-FSS',s.name,'No current appointed supervisor with certificate evidence and availability recorded'
from sites s where s.active and s.category in ('1','2') and not exists(select 1 from staff f where f.site_id=s.id and f.active and f.supervisor and f.available and f.certificate_date>current_date-interval '5 years' and f.certificate_date<=current_date and nullif(trim(f.certificate_ref),'') is not null)
union all select s.id,s.id,'AU-SCOPE',s.name,'Confirm category with local regulator before applying 3.2.2A' from sites s where s.active and s.category='unknown'
union all select f.id,f.site_id,'AU-TRAIN',f.name,f.training from v_training f join sites s on s.id=f.site_id where s.category in ('1','2') and f.training='Training evidence missing'
union all select c.id,c.site_id,'AU-RETAIN',c.name,'Retention date below three calendar months from last entry' from checks c join sites s on s.id=c.site_id where s.category='1' and c.retain_until<(greatest(c.created_at,c.updated_at,c.observed_at)+interval '3 months')::date
union all select e.id,e.site_id,'POLICY-CAL',e.name,'Calibration review due' from equipment e where e.active and e.calibration_due<current_date;
