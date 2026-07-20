create table public.report_cards (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools on delete cascade,
 student_id uuid not null references public.students on delete cascade,zman_id uuid references public.zmanim on delete set null,
 range_start date not null,range_end date not null,generated_at timestamptz not null default now(),generated_by uuid not null references public.staff,
 status text not null default 'draft' check(status in ('draft','approved')),approved_by uuid references public.staff,approved_at timestamptz,
 snapshot jsonb not null
);
alter table public.report_cards enable row level security;grant select,insert,update on public.report_cards to authenticated;
create policy report_card_principal_select on public.report_cards for select to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy report_card_principal_insert on public.report_cards for insert to authenticated with check(school_id=(select public.current_school_id()) and generated_by=(select auth.uid()) and (select public.has_role('principal')));
create policy report_card_principal_update on public.report_cards for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
