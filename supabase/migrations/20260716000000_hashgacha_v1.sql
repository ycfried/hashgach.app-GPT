create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.staff_role as enum ('rebbi','principal','mashpia');
create type public.attendance_status as enum ('present','late','absent','excused');
create type public.action_status as enum ('pending','exacted','waived');
create type public.action_category as enum ('punishment','reward');

create table public.schools (
  id uuid primary key default gen_random_uuid(), name text not null,
  settings jsonb not null default '{"snooze_days":1,"snooze_cap":3,"escalation_rate":0.05,"escalation_interval_days":1,"grade_thresholds":{"A":90,"B":80,"C":70,"D":60},"test_weights":{"quiz":0.5,"test":1,"final":4}}',
  created_at timestamptz not null default now()
);
create table public.staff (
  id uuid primary key references auth.users(id) on delete cascade, school_id uuid not null references public.schools on delete cascade,
  name text not null, roles public.staff_role[] not null default '{}', default_contact_interval_days int, created_at timestamptz not null default now()
);
create table public.invites (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  email citext not null, roles public.staff_role[] not null, token_hash text not null unique,
  created_by uuid not null references public.staff, expires_at timestamptz not null default now() + interval '7 days', used_at timestamptz
);
create table public.students (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  first_name text not null, last_name text not null, year_level text, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.periods (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  name text not null, start_time time not null, end_time time not null, sort_order int not null default 0
);
create table public.classes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  name text not null, subject text not null, grade_level text, created_at timestamptz not null default now()
);
create table public.class_offerings (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  class_id uuid not null references public.classes on delete cascade, period_id uuid references public.periods,
  rebbi_id uuid not null references public.staff, days_of_week smallint[] not null default '{}',
  default_start_time time, default_end_time time, is_recurring boolean not null default true
);
create table public.student_period_assignments (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade, period_id uuid not null references public.periods on delete cascade,
  class_offering_id uuid not null references public.class_offerings on delete cascade, unique(student_id,period_id)
);
create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  class_offering_id uuid not null references public.class_offerings, session_date date not null default current_date,
  actual_start_time time not null, actual_end_time time, started_by uuid not null references public.staff,
  started_at timestamptz not null default now(), status text not null default 'active' check(status in ('active','completed')),
  unique(class_offering_id,session_date)
);
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  attendance_session_id uuid not null references public.attendance_sessions on delete cascade,
  student_id uuid not null references public.students on delete cascade, status public.attendance_status not null,
  late_minutes int check(late_minutes is null or late_minutes >= 0), updated_by uuid references public.staff, updated_at timestamptz not null default now(),
  unique(attendance_session_id,student_id), check((status='late' and late_minutes is not null) or status<>'late')
);
create table public.excusal_records (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade, scope text not null check(scope in ('single_class','all_classes')),
  class_offering_id uuid references public.class_offerings, start_date date not null, end_date date, created_by uuid not null references public.staff,
  reason text, active boolean not null default true, check((scope='single_class' and class_offering_id is not null) or scope='all_classes')
);
create table public.punishment_types (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  name text not null, description text, category public.action_category not null, points_value numeric not null default 0,
  is_fine boolean not null default false, base_amount numeric(10,2), late_threshold_min int, late_threshold_max int, active boolean not null default true
);
create table public.punishment_records (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade, punishment_type_id uuid not null references public.punishment_types,
  assigned_by uuid references public.staff, assigned_at timestamptz not null default now(), created_via text not null default 'manual' check(created_via in ('manual','auto_lateness')),
  source_attendance_record_id uuid unique references public.attendance_records on delete set null, status public.action_status not null default 'pending',
  exacted_by uuid references public.staff, exacted_at timestamptz, exaction_notes text, due_at timestamptz,
  snoozed_until timestamptz, snooze_count int not null default 0, base_amount numeric(10,2), current_amount numeric(10,2),
  escalation_interval interval not null default interval '1 day', escalation_rate numeric not null default .05,
  escalation_cap numeric(10,2), escalation_active boolean not null default false, last_escalated_at timestamptz
);
create table public.zmanim (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade, name text not null, start_date date not null, end_date date not null);
create table public.tests (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  class_offering_id uuid not null references public.class_offerings, zman_id uuid references public.zmanim, name text not null,
  test_type text not null check(test_type in ('quiz','test','final')), test_date date not null, max_score numeric not null default 100
);
create table public.grades (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  test_id uuid not null references public.tests on delete cascade, student_id uuid not null references public.students on delete cascade,
  raw_score numeric not null check(raw_score >= 0), applied_bank numeric not null default 0, final_score numeric generated always as (least(100,raw_score+applied_bank)) stored,
  entered_by uuid not null references public.staff, created_at timestamptz not null default now(), unique(test_id,student_id)
);
create table public.point_bank (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade,
  student_id uuid not null references public.students on delete cascade, subject text not null, zman_id uuid not null references public.zmanim,
  balance numeric not null default 0, unique(student_id,subject,zman_id)
);
create table public.mentor_assignments (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade, mentor_id uuid not null references public.staff, student_id uuid not null references public.students on delete cascade, source text not null check(source in ('from_grade','manual_override')), contact_interval_days int, flagged boolean not null default false, unique(mentor_id,student_id));
create table public.mentor_conversations (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade, mentor_id uuid not null references public.staff, student_id uuid not null references public.students on delete cascade, conversation_date date not null default current_date, status text not null check(status in ('ongoing','completed')), notes text, shared_with_principal boolean not null default false, created_at timestamptz not null default now());
create table public.note_requests (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade, principal_id uuid not null references public.staff, mentor_id uuid not null references public.staff, student_id uuid not null references public.students, requested_at timestamptz not null default now(), requested_scope jsonb not null default '"all"', requested_duration_days int not null check(requested_duration_days between 1 and 14), status text not null default 'pending' check(status in ('pending','accepted','denied')), granted_scope jsonb, granted_type text check(granted_type in ('snapshot','ongoing')), expires_at timestamptz, ended_early_at timestamptz);
create table public.stats_access_requests (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade, mentor_id uuid not null references public.staff, principal_id uuid references public.staff, requested_at timestamptz not null default now(), status text not null default 'pending' check(status in ('pending','approved','denied')), responded_at timestamptz, expires_at timestamptz, revoked_at timestamptz, revoked_by uuid references public.staff);
create table public.chat_messages (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools on delete cascade, sender_id uuid not null references public.staff, channel_type text not null check(channel_type in ('general','class','dm')), channel_id uuid, body text not null, created_at timestamptz not null default now());
create table public.audit_log (id bigint generated always as identity primary key, actor_id uuid, action text not null, entity_type text not null, entity_id uuid, before_value jsonb, after_value jsonb, occurred_at timestamptz not null default now(), school_id uuid not null references public.schools);

create or replace function public.current_school_id() returns uuid language sql stable security invoker set search_path='' as $$ select school_id from public.staff where id=(select auth.uid()) $$;
create or replace function public.has_role(wanted public.staff_role) returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(wanted=any(roles),false) from public.staff where id=(select auth.uid()) $$;

alter table public.schools enable row level security;
do $$ declare t text; begin foreach t in array array['staff','invites','students','periods','classes','class_offerings','student_period_assignments','attendance_sessions','attendance_records','excusal_records','punishment_types','punishment_records','zmanim','tests','grades','point_bank','mentor_assignments','mentor_conversations','note_requests','stats_access_requests','chat_messages','audit_log'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy tenant_select on public.%I for select to authenticated using (school_id=(select public.current_school_id()))',t); execute format('create policy tenant_insert on public.%I for insert to authenticated with check (school_id=(select public.current_school_id()))',t); execute format('create policy tenant_update on public.%I for update to authenticated using (school_id=(select public.current_school_id())) with check (school_id=(select public.current_school_id()))',t); end loop; end $$;
create policy school_member_select on public.schools for select to authenticated using(id=(select public.current_school_id()));
create policy school_principal_update on public.schools for update to authenticated using(id=(select public.current_school_id()) and (select public.has_role('principal'))) with check(id=(select public.current_school_id()));

create or replace function public.sync_lateness_action() returns trigger language plpgsql security invoker set search_path='' as $$
declare match_id uuid; existing_status public.action_status;
begin
  select pr.status into existing_status from public.punishment_records pr where pr.source_attendance_record_id=new.id;
  if existing_status is not null and existing_status <> 'pending' then return new; end if;
  select pt.id into match_id from public.punishment_types pt where pt.school_id=new.school_id and pt.active and new.status='late' and new.late_minutes>=coalesce(pt.late_threshold_min,0) and (pt.late_threshold_max is null or new.late_minutes<=pt.late_threshold_max) order by pt.late_threshold_min desc limit 1;
  if match_id is null then delete from public.punishment_records where source_attendance_record_id=new.id and status='pending';
  else insert into public.punishment_records(school_id,student_id,punishment_type_id,created_via,source_attendance_record_id,base_amount,current_amount)
    select new.school_id,new.student_id,pt.id,'auto_lateness',new.id,pt.base_amount,pt.base_amount from public.punishment_types pt where pt.id=match_id
    on conflict(source_attendance_record_id) do update set punishment_type_id=excluded.punishment_type_id,base_amount=excluded.base_amount,current_amount=excluded.current_amount;
  end if; return new;
end $$;
create trigger attendance_lateness_action after insert or update of status,late_minutes on public.attendance_records for each row execute function public.sync_lateness_action();

create or replace function public.escalate_pending_fines() returns void language sql security invoker set search_path='' as $$
  update public.punishment_records set current_amount=least(coalesce(escalation_cap,999999),round(current_amount*(1+escalation_rate),2)),last_escalated_at=now()
  where status='pending' and escalation_active and (snoozed_until is null or snoozed_until<=now()) and (last_escalated_at is null or now()-last_escalated_at>=escalation_interval)
$$;

alter publication supabase_realtime add table public.chat_messages;
grant usage on schema public to authenticated;
grant select,insert,update on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;
