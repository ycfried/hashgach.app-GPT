create schema if not exists private;
create or replace function private.can_access_student(target_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.staff me join public.students st on st.id=target_student and st.school_id=me.school_id
  where me.id=(select auth.uid()) and (
   'principal'=any(me.roles)
   or exists(select 1 from public.student_period_assignments spa join public.class_offerings co on co.id=spa.class_offering_id where spa.student_id=target_student and co.rebbi_id=me.id)
   or exists(select 1 from public.mentor_assignments ma where ma.student_id=target_student and ma.mentor_id=me.id)
   or exists(select 1 from public.stats_access_requests sar where sar.mentor_id=me.id and sar.status='approved' and sar.expires_at>now() and sar.revoked_at is null)
  )
 )
$$;
revoke all on function private.can_access_student(uuid) from public,anon;
grant execute on function private.can_access_student(uuid) to authenticated;

drop policy if exists tenant_select on public.students;
create policy student_scoped_read on public.students for select to authenticated using(private.can_access_student(id));

drop policy if exists tenant_select on public.attendance_records;
create policy attendance_scoped_read on public.attendance_records for select to authenticated using(private.can_access_student(student_id));

drop policy if exists tenant_select on public.grades;
create policy grade_scoped_read on public.grades for select to authenticated using(private.can_access_student(student_id));

drop policy if exists tenant_select on public.punishment_records;
create policy discipline_scoped_read on public.punishment_records for select to authenticated using(
 school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or assigned_by=(select auth.uid()) or private.can_access_student(student_id))
);
