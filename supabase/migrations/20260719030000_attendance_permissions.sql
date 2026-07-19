-- Attendance is operationally owned by the assigned rebbi, with principal oversight.
drop policy if exists tenant_select on public.attendance_sessions;
drop policy if exists tenant_insert on public.attendance_sessions;
drop policy if exists tenant_update on public.attendance_sessions;
create policy attendance_session_relationship_select on public.attendance_sessions for select to authenticated using(
  school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid())))
);
create policy attendance_session_owner_insert on public.attendance_sessions for insert to authenticated with check(
  school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))) and started_by=(select auth.uid())
);
create policy attendance_session_owner_update on public.attendance_sessions for update to authenticated using(
  school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid())))
) with check(school_id=(select public.current_school_id()));

drop policy if exists tenant_select on public.attendance_records;
drop policy if exists tenant_insert on public.attendance_records;
drop policy if exists tenant_update on public.attendance_records;
create policy attendance_record_relationship_select on public.attendance_records for select to authenticated using(
  school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.attendance_sessions ses join public.class_offerings co on co.id=ses.class_offering_id where ses.id=attendance_session_id and co.rebbi_id=(select auth.uid())))
);
create policy attendance_record_owner_insert on public.attendance_records for insert to authenticated with check(
  school_id=(select public.current_school_id()) and updated_by=(select auth.uid()) and ((select public.has_role('principal')) or exists(select 1 from public.attendance_sessions ses join public.class_offerings co on co.id=ses.class_offering_id where ses.id=attendance_session_id and co.rebbi_id=(select auth.uid())))
);
create policy attendance_record_owner_update on public.attendance_records for update to authenticated using(
  school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.attendance_sessions ses join public.class_offerings co on co.id=ses.class_offering_id where ses.id=attendance_session_id and co.rebbi_id=(select auth.uid())))
) with check(school_id=(select public.current_school_id()) and updated_by=(select auth.uid()));
