-- Direct-jurisdiction lifecycle policies for setup records and staff messages.
drop policy if exists chat_edit_own on public.chat_messages;
drop policy if exists chat_delete_own on public.chat_messages;
create policy chat_edit_own on public.chat_messages for update to authenticated
using (school_id=(select public.current_school_id()) and sender_id=(select auth.uid()))
with check (school_id=(select public.current_school_id()) and sender_id=(select auth.uid()));
create policy chat_delete_own on public.chat_messages for delete to authenticated
using (school_id=(select public.current_school_id()) and sender_id=(select auth.uid()));

drop policy if exists principal_period_delete on public.periods;
create policy principal_period_delete on public.periods for delete to authenticated
using (school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists principal_class_delete on public.classes;
create policy principal_class_delete on public.classes for delete to authenticated
using (school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists principal_or_owner_offering_insert on public.class_offerings;
drop policy if exists principal_or_owner_offering_delete on public.class_offerings;
create policy principal_or_owner_offering_insert on public.class_offerings for insert to authenticated
with check (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or rebbi_id=(select auth.uid())));
create policy principal_or_owner_offering_delete on public.class_offerings for delete to authenticated
using (school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or rebbi_id=(select auth.uid())));

drop policy if exists jurisdiction_assignment_insert on public.student_period_assignments;
drop policy if exists jurisdiction_assignment_update on public.student_period_assignments;
drop policy if exists jurisdiction_assignment_delete on public.student_period_assignments;
drop policy if exists principal_assignment_insert on public.student_period_assignments;
drop policy if exists principal_assignment_update on public.student_period_assignments;
create policy jurisdiction_assignment_insert on public.student_period_assignments for insert to authenticated
with check (
  school_id=(select public.current_school_id()) and
  ((select public.has_role('principal')) or exists(
    select 1 from public.class_offerings co
    where co.id=class_offering_id and co.school_id=(select public.current_school_id()) and co.rebbi_id=(select auth.uid())
  ))
);
create policy jurisdiction_assignment_update on public.student_period_assignments for update to authenticated
using (
  school_id=(select public.current_school_id()) and
  ((select public.has_role('principal')) or exists(
    select 1 from public.class_offerings co
    where co.id=class_offering_id and co.school_id=(select public.current_school_id()) and co.rebbi_id=(select auth.uid())
  ))
)
with check (
  school_id=(select public.current_school_id()) and
  ((select public.has_role('principal')) or exists(
    select 1 from public.class_offerings co
    where co.id=class_offering_id and co.school_id=(select public.current_school_id()) and co.rebbi_id=(select auth.uid())
  ))
);
create policy jurisdiction_assignment_delete on public.student_period_assignments for delete to authenticated
using (
  school_id=(select public.current_school_id()) and
  ((select public.has_role('principal')) or exists(
    select 1 from public.class_offerings co
    where co.id=class_offering_id and co.school_id=(select public.current_school_id()) and co.rebbi_id=(select auth.uid())
  ))
);
