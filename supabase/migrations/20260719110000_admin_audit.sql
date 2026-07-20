drop policy if exists tenant_select on public.audit_log;
drop policy if exists tenant_insert on public.audit_log;
drop policy if exists tenant_update on public.audit_log;
create policy audit_principal_read on public.audit_log for select to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy audit_principal_write on public.audit_log for insert to authenticated with check(school_id=(select public.current_school_id()) and actor_id=(select auth.uid()) and (select public.has_role('principal')));

create or replace function public.capture_principal_audit() returns trigger language plpgsql set search_path='' as $$
declare before_row jsonb; after_row jsonb; tenant uuid; row_id uuid;
begin
  if not public.has_role('principal') then return coalesce(new,old); end if;
  before_row=case when tg_op='INSERT' then null else to_jsonb(old) end;
  after_row=case when tg_op='DELETE' then null else to_jsonb(new) end;
  tenant=coalesce((after_row->>'school_id')::uuid,(before_row->>'school_id')::uuid,(after_row->>'id')::uuid,(before_row->>'id')::uuid);
  row_id=coalesce((after_row->>'id')::uuid,(before_row->>'id')::uuid);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,before_value,after_value,school_id)
  values((select auth.uid()),lower(tg_op),tg_table_name,row_id,before_row,after_row,tenant);
  return coalesce(new,old);
end $$;
revoke all on function public.capture_principal_audit() from public,anon,authenticated;

do $$ declare table_name text; begin
 foreach table_name in array array['students','grades','punishment_records','report_cards','schools','staff','class_offerings'] loop
  execute format('drop trigger if exists principal_audit on public.%I',table_name);
  execute format('create trigger principal_audit after insert or update or delete on public.%I for each row execute function public.capture_principal_audit()',table_name);
 end loop;
end $$;
