create or replace function private.provision_confirmed_staff() returns trigger language plpgsql security definer set search_path='' as $$
declare matched public.invites%rowtype; token text; display_name text;
begin
 if new.email_confirmed_at is null or exists(select 1 from public.staff where id=new.id) then return new; end if;
 token:=new.raw_user_meta_data->>'pending_invite';display_name:=trim(coalesce(new.raw_user_meta_data->>'signup_name',''));
 if token is null or display_name='' then return new; end if;
 select * into matched from public.invites where token_hash=encode(extensions.digest(token,'sha256'),'hex') and lower(email::text)=lower(new.email) and used_at is null and expires_at>now() for update;
 if matched.id is null then return new; end if;
 insert into public.staff(id,school_id,name,roles) values(new.id,matched.school_id,display_name,matched.roles) on conflict(id) do nothing;
 update public.invites set used_at=now() where id=matched.id and used_at is null;
 return new;
end $$;
revoke all on function private.provision_confirmed_staff() from public,anon,authenticated;
drop trigger if exists provision_confirmed_staff on auth.users;
create trigger provision_confirmed_staff after insert or update of email_confirmed_at on auth.users for each row execute function private.provision_confirmed_staff();

insert into public.staff(id,school_id,name,roles)
select u.id,i.school_id,trim(u.raw_user_meta_data->>'signup_name'),i.roles from auth.users u join public.invites i on i.token_hash=encode(extensions.digest(u.raw_user_meta_data->>'pending_invite','sha256'),'hex') and lower(i.email::text)=lower(u.email)
where u.email_confirmed_at is not null and i.used_at is null and i.expires_at>now() and coalesce(trim(u.raw_user_meta_data->>'signup_name'),'')<>'' on conflict(id) do nothing;
update public.invites i set used_at=now() from auth.users u where i.token_hash=encode(extensions.digest(u.raw_user_meta_data->>'pending_invite','sha256'),'hex') and lower(i.email::text)=lower(u.email) and u.email_confirmed_at is not null and exists(select 1 from public.staff s where s.id=u.id) and i.used_at is null;
