-- Principal oversight plus teacher ownership for discipline and rewards.
drop policy if exists tenant_select on public.punishment_types;
drop policy if exists tenant_insert on public.punishment_types;
drop policy if exists tenant_update on public.punishment_types;
create policy discipline_type_tenant_select on public.punishment_types for select to authenticated using(school_id=(select public.current_school_id()));
create policy principal_discipline_type_insert on public.punishment_types for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_discipline_type_update on public.punishment_types for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists tenant_select on public.punishment_records;
drop policy if exists tenant_insert on public.punishment_records;
drop policy if exists tenant_update on public.punishment_records;
create policy discipline_record_relationship_select on public.punishment_records for select to authenticated using(
  school_id=(select public.current_school_id()) and (
    (select public.has_role('principal')) or assigned_by=(select auth.uid())
    or exists(select 1 from public.attendance_records ar join public.attendance_sessions ses on ses.id=ar.attendance_session_id join public.class_offerings co on co.id=ses.class_offering_id where ar.id=source_attendance_record_id and co.rebbi_id=(select auth.uid()))
  )
);
create policy discipline_record_relationship_insert on public.punishment_records for insert to authenticated with check(
  school_id=(select public.current_school_id()) and (
    ((assigned_by=(select auth.uid())) and ((select public.has_role('principal')) or exists(select 1 from public.student_period_assignments spa join public.class_offerings co on co.id=spa.class_offering_id where spa.student_id=student_id and co.rebbi_id=(select auth.uid()))))
    or (created_via='auto_lateness' and assigned_by is null and exists(select 1 from public.attendance_records ar join public.attendance_sessions ses on ses.id=ar.attendance_session_id join public.class_offerings co on co.id=ses.class_offering_id where ar.id=source_attendance_record_id and co.rebbi_id=(select auth.uid())))
  )
);
create policy principal_discipline_record_update on public.punishment_records for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
