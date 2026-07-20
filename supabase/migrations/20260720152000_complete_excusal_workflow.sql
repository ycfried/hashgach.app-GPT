-- Excusals are visible to school staff so teachers can honor them, but only
-- principals may create or change them.
drop policy if exists tenant_insert on public.excusal_records;
drop policy if exists tenant_update on public.excusal_records;
drop policy if exists principal_excusal_insert on public.excusal_records;
drop policy if exists principal_excusal_update on public.excusal_records;
drop policy if exists principal_excusal_delete on public.excusal_records;

create policy principal_excusal_insert on public.excusal_records
for insert to authenticated
with check (
  school_id = (select public.current_school_id())
  and (select public.has_role('principal'::public.staff_role))
  and created_by = (select auth.uid())
);

create policy principal_excusal_update on public.excusal_records
for update to authenticated
using (
  school_id = (select public.current_school_id())
  and (select public.has_role('principal'::public.staff_role))
)
with check (
  school_id = (select public.current_school_id())
  and (select public.has_role('principal'::public.staff_role))
);

create policy principal_excusal_delete on public.excusal_records
for delete to authenticated
using (
  school_id = (select public.current_school_id())
  and (select public.has_role('principal'::public.staff_role))
);

grant select, insert, update, delete on public.excusal_records to authenticated;

create index if not exists excusal_records_active_student_idx
on public.excusal_records (school_id, student_id, start_date, end_date)
where active;

drop trigger if exists audit_lifecycle on public.excusal_records;
create trigger audit_lifecycle
after insert or update or delete on public.excusal_records
for each row execute function private.audit_row_change();
