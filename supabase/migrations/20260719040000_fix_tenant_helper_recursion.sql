-- Policy helpers must bypass staff RLS to avoid recursive evaluation.
-- They expose only the current authenticated user's own tenant and role membership.
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select school_id from public.staff where id=(select auth.uid())
$$;

create or replace function public.has_role(wanted public.staff_role)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(wanted=any(roles),false) from public.staff where id=(select auth.uid())
$$;

revoke all on function public.current_school_id() from public, anon;
revoke all on function public.has_role(public.staff_role) from public, anon;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.has_role(public.staff_role) to authenticated;
