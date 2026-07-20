-- Complete lifecycle permissions and audit attribution.
alter table public.staff add column if not exists active boolean not null default true;
alter table public.report_cards add column if not exists archived_at timestamptz;

drop policy if exists principal_staff_delete on public.staff;
create policy principal_staff_delete on public.staff for delete to authenticated
using (school_id=(select public.current_school_id()) and (select public.has_role('principal')) and id<>(select auth.uid()));

drop policy if exists principal_invite_delete on public.invites;
create policy principal_invite_delete on public.invites for delete to authenticated
using (school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists principal_zman_delete on public.zmanim;
create policy principal_zman_delete on public.zmanim for delete to authenticated
using (school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists test_owner_update on public.tests;
create policy test_owner_update on public.tests for update to authenticated
using (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))))
with check (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))));
drop policy if exists test_jurisdiction_delete on public.tests;
create policy test_jurisdiction_delete on public.tests for delete to authenticated
using (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))));

drop policy if exists grade_jurisdiction_delete on public.grades;
create policy grade_jurisdiction_delete on public.grades for delete to authenticated
using (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.tests t join public.class_offerings co on co.id=t.class_offering_id where t.id=test_id and co.rebbi_id=(select auth.uid()))));

drop policy if exists principal_mentor_assignment_delete on public.mentor_assignments;
create policy principal_mentor_assignment_delete on public.mentor_assignments for delete to authenticated
using (school_id=(select public.current_school_id()) and (select public.has_role('principal')));
drop policy if exists mentor_conversation_owner_delete on public.mentor_conversations;
create policy mentor_conversation_owner_delete on public.mentor_conversations for delete to authenticated
using (school_id=(select public.current_school_id()) and mentor_id=(select auth.uid()));

drop policy if exists discipline_record_owner_update on public.punishment_records;
create policy discipline_record_owner_update on public.punishment_records for update to authenticated
using (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or (assigned_by=(select auth.uid()) and status='pending')))
with check (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or assigned_by=(select auth.uid())));
drop policy if exists discipline_record_owner_delete on public.punishment_records;
create policy discipline_record_owner_delete on public.punishment_records for delete to authenticated
using (school_id=(select public.current_school_id()) and status='pending' and ((select public.has_role('principal')) or assigned_by=(select auth.uid())));

drop policy if exists schedule_template_principal_delete on public.schedule_templates;
create policy schedule_template_principal_delete on public.schedule_templates for delete to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
drop policy if exists schedule_block_principal_delete on public.schedule_blocks;
create policy schedule_block_principal_delete on public.schedule_blocks for delete to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
drop policy if exists schedule_instance_principal_delete on public.schedule_instances;
create policy schedule_instance_principal_delete on public.schedule_instances for delete to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists report_card_principal_delete on public.report_cards;
create policy report_card_principal_delete on public.report_cards for delete to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

grant delete on public.staff,public.invites,public.zmanim,public.tests,public.grades,public.mentor_assignments,public.mentor_conversations,public.punishment_records,public.schedule_templates,public.schedule_blocks,public.schedule_instances,public.report_cards to authenticated;

create schema if not exists private;
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  row_school uuid;
  row_id uuid;
begin
  row_school:=coalesce((to_jsonb(new)->>'school_id')::uuid,(to_jsonb(old)->>'school_id')::uuid);
  row_id:=coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(old)->>'id')::uuid);
  if (select auth.uid()) is not null and row_school is not null then
    insert into public.audit_log(actor_id,action,entity_type,entity_id,before_value,after_value,school_id)
    values((select auth.uid()),lower(tg_op),tg_table_name,row_id,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,row_school);
  end if;
  return coalesce(new,old);
end
$$;
revoke all on function private.audit_row_change() from public,anon,authenticated;

do $$
declare t text;
begin
  foreach t in array array['staff','students','periods','classes','class_offerings','student_period_assignments','punishment_types','punishment_records','zmanim','tests','grades','mentor_assignments','mentor_conversations','note_requests','stats_access_requests','chat_messages','schedule_templates','schedule_blocks','schedule_instances','report_cards']
  loop
    execute format('drop trigger if exists audit_lifecycle on public.%I',t);
    execute format('create trigger audit_lifecycle after insert or update or delete on public.%I for each row execute function private.audit_row_change()',t);
  end loop;
end $$;
