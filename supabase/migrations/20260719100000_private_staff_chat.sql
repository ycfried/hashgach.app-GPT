drop policy if exists tenant_select on public.chat_messages;
drop policy if exists tenant_insert on public.chat_messages;
drop policy if exists tenant_update on public.chat_messages;

create policy chat_read on public.chat_messages for select to authenticated using (
  school_id=(select public.current_school_id()) and
  (channel_type in ('general','class') or sender_id=(select auth.uid()) or channel_id=(select auth.uid()))
);
create policy chat_send on public.chat_messages for insert to authenticated with check (
  school_id=(select public.current_school_id()) and sender_id=(select auth.uid()) and
  (channel_type in ('general','class') or (channel_type='dm' and channel_id is not null and channel_id<>(select auth.uid())))
);
grant select,insert on public.chat_messages to authenticated;
