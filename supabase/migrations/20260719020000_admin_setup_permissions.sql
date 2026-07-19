-- Principal-owned administration; operational reads stay relationship-scoped.
drop policy if exists tenant_select on public.students;
drop policy if exists tenant_insert on public.students;
drop policy if exists tenant_update on public.students;
create policy student_relationship_select on public.students for select to authenticated using(
  school_id=(select public.current_school_id()) and (
    (select public.has_role('principal'))
    or exists(select 1 from public.student_period_assignments spa join public.class_offerings co on co.id=spa.class_offering_id where spa.student_id=students.id and co.rebbi_id=(select auth.uid()))
    or exists(select 1 from public.mentor_assignments ma where ma.student_id=students.id and ma.mentor_id=(select auth.uid()))
  )
);
create policy principal_student_insert on public.students for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_student_update on public.students for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists tenant_insert on public.periods;
drop policy if exists tenant_update on public.periods;
create policy principal_period_insert on public.periods for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_period_update on public.periods for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists tenant_select on public.classes;
drop policy if exists tenant_insert on public.classes;
drop policy if exists tenant_update on public.classes;
create policy class_relationship_select on public.classes for select to authenticated using(
  school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.class_id=classes.id and co.rebbi_id=(select auth.uid())))
);
create policy principal_class_insert on public.classes for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_class_update on public.classes for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists tenant_select on public.class_offerings;
drop policy if exists tenant_insert on public.class_offerings;
drop policy if exists tenant_update on public.class_offerings;
create policy offering_relationship_select on public.class_offerings for select to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or rebbi_id=(select auth.uid())));
create policy principal_offering_insert on public.class_offerings for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_or_owner_offering_update on public.class_offerings for update to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or rebbi_id=(select auth.uid()))) with check(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or rebbi_id=(select auth.uid())));

drop policy if exists tenant_select on public.student_period_assignments;
drop policy if exists tenant_insert on public.student_period_assignments;
drop policy if exists tenant_update on public.student_period_assignments;
create policy assignment_relationship_select on public.student_period_assignments for select to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))));
create policy principal_assignment_insert on public.student_period_assignments for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_assignment_update on public.student_period_assignments for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
