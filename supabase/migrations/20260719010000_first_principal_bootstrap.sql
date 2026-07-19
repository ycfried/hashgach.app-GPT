alter table public.invites
  add column if not exists created_via text not null default 'principal'
  check(created_via in ('principal','system_bootstrap'));

alter table public.invites alter column created_by drop not null;

alter table public.invites
  add constraint invite_creator_required
  check(
    (created_via='principal' and created_by is not null)
    or
    (created_via='system_bootstrap' and created_by is null and roles=array['principal']::public.staff_role[])
  );

create unique index if not exists one_system_bootstrap_invite_per_school
  on public.invites(school_id)
  where created_via='system_bootstrap';
