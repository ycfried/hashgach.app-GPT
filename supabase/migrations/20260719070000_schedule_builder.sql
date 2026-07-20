create table public.schedule_templates (
  id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools on delete cascade,
  name text not null,default_anchor_time time not null default '08:00',active boolean not null default true,created_at timestamptz not null default now()
);
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools on delete cascade,
  template_id uuid not null references public.schedule_templates on delete cascade,name text not null,position int not null,
  duration_minutes int not null check(duration_minutes>0),gap_after_minutes int not null default 0 check(gap_after_minutes>=0),unique(template_id,position)
);
create table public.schedule_instances (
  id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools on delete cascade,
  template_id uuid not null references public.schedule_templates,date date not null,anchor_start_time time not null,
  calculated_blocks jsonb not null,created_by uuid not null references public.staff,created_at timestamptz not null default now(),unique(school_id,date)
);
alter table public.schedule_templates enable row level security;alter table public.schedule_blocks enable row level security;alter table public.schedule_instances enable row level security;
grant select,insert,update on public.schedule_templates,public.schedule_blocks,public.schedule_instances to authenticated;
create policy schedule_template_select on public.schedule_templates for select to authenticated using(school_id=(select public.current_school_id()));
create policy schedule_template_principal_insert on public.schedule_templates for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy schedule_template_principal_update on public.schedule_templates for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()));
create policy schedule_block_select on public.schedule_blocks for select to authenticated using(school_id=(select public.current_school_id()));
create policy schedule_block_principal_insert on public.schedule_blocks for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy schedule_block_principal_update on public.schedule_blocks for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()));
create policy schedule_instance_select on public.schedule_instances for select to authenticated using(school_id=(select public.current_school_id()));
create policy schedule_instance_principal_insert on public.schedule_instances for insert to authenticated with check(school_id=(select public.current_school_id()) and created_by=(select auth.uid()) and (select public.has_role('principal')));
create policy schedule_instance_principal_update on public.schedule_instances for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()));
