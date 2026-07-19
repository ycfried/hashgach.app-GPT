create or replace function public.has_role(wanted text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(wanted::public.staff_role = any(roles), false)
  from public.staff
  where id = (select auth.uid())
$$;

create or replace function public.create_staff_invites(p_emails text[], p_roles text[])
returns table(email text, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = 'public', 'extensions', 'auth'
as $$
declare
  actor_school uuid;
  candidate text;
  raw_token text;
  expiry timestamptz;
begin
  select school_id into actor_school
  from public.staff
  where id = auth.uid() and 'principal'::public.staff_role = any(roles);

  if actor_school is null then raise exception 'principal access required'; end if;
  if cardinality(p_emails) = 0 then raise exception 'at least one email is required'; end if;
  if cardinality(p_roles) = 0 or not (p_roles <@ array['rebbi','principal','mashpia']::text[]) then
    raise exception 'invalid role selection';
  end if;

  foreach candidate in array p_emails loop
    candidate := lower(trim(candidate));
    if candidate !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'invalid email: %', candidate;
    end if;
    raw_token := encode(gen_random_bytes(32), 'hex');
    expiry := now() + interval '7 days';
    insert into public.invites(school_id,email,roles,token_hash,created_by,expires_at)
    values(actor_school,candidate,p_roles::public.staff_role[],encode(digest(raw_token,'sha256'),'hex'),auth.uid(),expiry);
    email := candidate; token := raw_token; expires_at := expiry;
    return next;
  end loop;
end
$$;

create or replace function public.inspect_staff_invite(p_token text)
returns table(email text, school_name text, roles text[], expires_at timestamptz)
language sql
stable
security definer
set search_path = 'public', 'extensions'
as $$
  select i.email::text, s.name, i.roles::text[], i.expires_at
  from public.invites i
  join public.schools s on s.id=i.school_id
  where i.token_hash=encode(digest(p_token,'sha256'),'hex')
    and i.used_at is null and i.expires_at>now()
  limit 1
$$;

create or replace function public.accept_staff_invite(p_token text, p_name text)
returns void
language plpgsql
security definer
set search_path = 'public', 'extensions', 'auth'
as $$
declare
  matched public.invites%rowtype;
  signed_in_email text;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  select * into matched from public.invites
  where token_hash=encode(digest(p_token,'sha256'),'hex')
    and used_at is null and expires_at>now()
  for update;
  if matched.id is null then raise exception 'invite is invalid or expired'; end if;
  select lower(email) into signed_in_email from auth.users where id=auth.uid();
  if signed_in_email is distinct from lower(matched.email::text) then raise exception 'invite email does not match signed-in user'; end if;
  insert into public.staff(id,school_id,name,roles)
  values(auth.uid(),matched.school_id,trim(p_name),matched.roles)
  on conflict(id) do update set school_id=excluded.school_id,name=excluded.name,roles=excluded.roles;
  update public.invites set used_at=now() where id=matched.id;
end
$$;

revoke all on function public.create_staff_invites(text[],text[]) from public, anon;
revoke all on function public.inspect_staff_invite(text) from public;
revoke all on function public.accept_staff_invite(text,text) from public, anon;
grant execute on function public.create_staff_invites(text[],text[]) to authenticated;
grant execute on function public.inspect_staff_invite(text) to anon, authenticated;
grant execute on function public.accept_staff_invite(text,text) to authenticated;

drop policy if exists tenant_insert on public.staff;
drop policy if exists tenant_update on public.staff;
drop policy if exists tenant_insert on public.invites;
drop policy if exists tenant_update on public.invites;
create policy principal_staff_insert on public.staff for insert to authenticated
with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_staff_update on public.staff for update to authenticated
using(school_id=(select public.current_school_id()) and (select public.has_role('principal')))
with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_invite_insert on public.invites for insert to authenticated
with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_invite_update on public.invites for update to authenticated
using(school_id=(select public.current_school_id()) and (select public.has_role('principal')))
with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
