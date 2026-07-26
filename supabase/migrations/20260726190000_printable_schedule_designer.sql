alter table public.schedule_templates
  add column if not exists print_design jsonb not null default
    '{"title":"","subtitle":"","accent":"#173f68","letterheadDataUrl":"","backgroundDataUrl":""}'::jsonb;

alter table public.schedule_blocks
  add column if not exists rule_type text not null default 'after_previous'
    check (rule_type in ('after_previous', 'fixed_start')),
  add column if not exists fixed_start_time time;

alter table public.schedule_blocks
  add constraint schedule_blocks_fixed_start_rule
  check (rule_type <> 'fixed_start' or fixed_start_time is not null);

alter table public.schedule_instances
  add column if not exists label text not null default 'Schedule';

comment on column public.schedule_templates.print_design is
  'Per-template printable PDF branding. Data URL images are client-limited to 1.5 MB.';
comment on column public.schedule_blocks.rule_type is
  'after_previous applies duration and gap rules; fixed_start anchors this block to a clock time.';
comment on column public.schedule_instances.label is
  'Principal-facing reusable schedule label, such as Friday or Fast Day Schedule.';
