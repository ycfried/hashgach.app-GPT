alter table public.grades add column if not exists updated_at timestamptz not null default now();

create table if not exists public.point_bank_transfers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  subject text not null,
  source_test_id uuid not null references public.tests on delete cascade,
  target_test_id uuid not null references public.tests on delete cascade,
  amount numeric not null check(amount>0),
  zman_id uuid not null references public.zmanim on delete cascade,
  applied_at timestamptz not null default now()
);
alter table public.point_bank_transfers enable row level security;
grant select on public.point_bank_transfers to authenticated;

create or replace function public.rebalance_point_bank()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  subject_name text;
  current_zman uuid;
  source record;
  target record;
  available numeric;
  needed numeric;
  moved numeric;
  remaining numeric:=0;
begin
  if pg_trigger_depth()>1 then return new; end if;
  select c.subject,t.zman_id into subject_name,current_zman
  from public.tests t join public.class_offerings co on co.id=t.class_offering_id join public.classes c on c.id=co.class_id
  where t.id=new.test_id;
  update public.grades g set applied_bank=0,updated_at=now()
  from public.tests t join public.class_offerings co on co.id=t.class_offering_id join public.classes c on c.id=co.class_id
  where g.test_id=t.id and g.student_id=new.student_id and t.zman_id=current_zman and c.subject=subject_name;
  delete from public.point_bank_transfers where student_id=new.student_id and subject=subject_name and zman_id=current_zman;
  for source in
    select g.test_id,greatest(g.raw_score-100,0) surplus from public.grades g join public.tests t on t.id=g.test_id join public.class_offerings co on co.id=t.class_offering_id join public.classes c on c.id=co.class_id
    where g.student_id=new.student_id and t.zman_id=current_zman and c.subject=subject_name and g.raw_score>100 order by t.test_date,t.id
  loop
    available:=source.surplus;
    for target in
      select g.test_id,g.raw_score+g.applied_bank score from public.grades g join public.tests t on t.id=g.test_id join public.class_offerings co on co.id=t.class_offering_id join public.classes c on c.id=co.class_id
      where g.student_id=new.student_id and t.zman_id=current_zman and c.subject=subject_name and g.raw_score+g.applied_bank<100 order by g.raw_score+g.applied_bank,t.test_date,t.id
    loop
      exit when available<=0;
      needed:=100-target.score;moved:=least(available,needed);
      update public.grades set applied_bank=applied_bank+moved,updated_at=now() where student_id=new.student_id and test_id=target.test_id;
      insert into public.point_bank_transfers(school_id,student_id,subject,source_test_id,target_test_id,amount,zman_id)
      values(new.school_id,new.student_id,subject_name,source.test_id,target.test_id,moved,current_zman);
      available:=available-moved;
    end loop;
    remaining:=remaining+available;
  end loop;
  insert into public.point_bank(school_id,student_id,subject,zman_id,balance)
  values(new.school_id,new.student_id,subject_name,current_zman,remaining)
  on conflict(student_id,subject,zman_id) do update set balance=excluded.balance;
  return new;
end
$$;
revoke all on function public.rebalance_point_bank() from public,anon,authenticated;
drop trigger if exists rebalance_point_bank_after_grade on public.grades;
create trigger rebalance_point_bank_after_grade after insert or update of raw_score on public.grades for each row execute function public.rebalance_point_bank();

drop policy if exists tenant_insert on public.zmanim;drop policy if exists tenant_update on public.zmanim;
create policy principal_zman_insert on public.zmanim for insert to authenticated with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));
create policy principal_zman_update on public.zmanim for update to authenticated using(school_id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(school_id=(select public.current_school_id()) and (select public.has_role('principal')));

drop policy if exists tenant_select on public.tests;drop policy if exists tenant_insert on public.tests;drop policy if exists tenant_update on public.tests;
create policy test_relationship_select on public.tests for select to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))));
create policy test_owner_insert on public.tests for insert to authenticated with check(school_id=(select public.current_school_id()) and exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid())));
create policy test_owner_update on public.tests for update to authenticated using(school_id=(select public.current_school_id()) and exists(select 1 from public.class_offerings co where co.id=class_offering_id and co.rebbi_id=(select auth.uid()))) with check(school_id=(select public.current_school_id()));

drop policy if exists tenant_select on public.grades;drop policy if exists tenant_insert on public.grades;drop policy if exists tenant_update on public.grades;
create policy grade_relationship_select on public.grades for select to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.tests t join public.class_offerings co on co.id=t.class_offering_id where t.id=test_id and co.rebbi_id=(select auth.uid()))));
create policy grade_owner_insert on public.grades for insert to authenticated with check(school_id=(select public.current_school_id()) and entered_by=(select auth.uid()) and exists(select 1 from public.tests t join public.class_offerings co on co.id=t.class_offering_id where t.id=test_id and co.rebbi_id=(select auth.uid())));
create policy grade_owner_update on public.grades for update to authenticated using(school_id=(select public.current_school_id()) and exists(select 1 from public.tests t join public.class_offerings co on co.id=t.class_offering_id where t.id=test_id and co.rebbi_id=(select auth.uid()))) with check(school_id=(select public.current_school_id()));

drop policy if exists tenant_select on public.point_bank;
create policy point_bank_relationship_select on public.point_bank for select to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.student_period_assignments spa join public.class_offerings co on co.id=spa.class_offering_id join public.classes c on c.id=co.class_id where spa.student_id=point_bank.student_id and co.rebbi_id=(select auth.uid()) and c.subject=point_bank.subject)));
create policy transfer_relationship_select on public.point_bank_transfers for select to authenticated using(school_id=(select public.current_school_id()) and ((select public.has_role('principal')) or exists(select 1 from public.tests t join public.class_offerings co on co.id=t.class_offering_id where t.id=source_test_id and co.rebbi_id=(select auth.uid()))));
