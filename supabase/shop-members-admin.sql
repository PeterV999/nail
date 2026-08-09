create or replace function public.list_shop_members_for_admin(
  target_shop_id uuid
)
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    shop_members.user_id,
    auth.users.email::text,
    shop_members.role,
    shop_members.created_at
  from public.shop_members
  join auth.users
    on auth.users.id = shop_members.user_id
  where shop_members.shop_id = target_shop_id
    and (
      public.is_platform_admin(auth.uid())
      or exists (
        select 1
        from public.shop_members actor
        where actor.shop_id = target_shop_id
          and actor.user_id = auth.uid()
          and actor.role = 'owner'
      )
    )
  order by shop_members.created_at asc;
$$;

create or replace function public.upsert_shop_member_by_email(
  target_shop_id uuid,
  member_email text,
  member_role text default 'staff'
)
returns table(
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  clean_email text := lower(nullif(btrim(member_email), ''));
  clean_role text := lower(btrim(coalesce(member_role, 'staff')));
  member_user_id uuid;
begin
  if not (
    public.is_platform_admin(auth.uid())
    or exists (
      select 1
      from public.shop_members actor
      where actor.shop_id = target_shop_id
        and actor.user_id = auth.uid()
        and actor.role = 'owner'
    )
  ) then
    raise exception 'SHOP_OWNER_REQUIRED' using errcode = '42501';
  end if;

  if clean_email is null then
    raise exception 'MEMBER_EMAIL_REQUIRED' using errcode = '22023';
  end if;

  if clean_role not in ('owner', 'staff') then
    raise exception 'MEMBER_ROLE_INVALID' using errcode = '22023';
  end if;

  select auth.users.id into member_user_id
  from auth.users
  where lower(auth.users.email) = clean_email
  limit 1;

  if member_user_id is null then
    raise exception 'MEMBER_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.shop_members (shop_id, user_id, role)
  values (target_shop_id, member_user_id, clean_role)
  on conflict (shop_id, user_id) do update
  set role = excluded.role;

  return query
  select
    shop_members.user_id,
    auth.users.email::text,
    shop_members.role,
    shop_members.created_at
  from public.shop_members
  join auth.users
    on auth.users.id = shop_members.user_id
  where shop_members.shop_id = target_shop_id
    and shop_members.user_id = member_user_id;
end;
$$;

create or replace function public.remove_shop_member_for_admin(
  target_shop_id uuid,
  member_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_owners integer;
begin
  if not (
    public.is_platform_admin(auth.uid())
    or exists (
      select 1
      from public.shop_members actor
      where actor.shop_id = target_shop_id
        and actor.user_id = auth.uid()
        and actor.role = 'owner'
    )
  ) then
    raise exception 'SHOP_OWNER_REQUIRED' using errcode = '42501';
  end if;

  select count(*) into remaining_owners
  from public.shop_members
  where shop_id = target_shop_id
    and role = 'owner'
    and user_id <> member_user_id;

  if remaining_owners = 0 then
    raise exception 'SHOP_LAST_OWNER_REQUIRED' using errcode = '23514';
  end if;

  delete from public.shop_members
  where shop_id = target_shop_id
    and user_id = member_user_id;

  return true;
end;
$$;

revoke all on function public.list_shop_members_for_admin(uuid) from public;
revoke all on function public.upsert_shop_member_by_email(uuid, text, text) from public;
revoke all on function public.remove_shop_member_for_admin(uuid, uuid) from public;
grant execute on function public.list_shop_members_for_admin(uuid) to authenticated;
grant execute on function public.upsert_shop_member_by_email(uuid, text, text) to authenticated;
grant execute on function public.remove_shop_member_for_admin(uuid, uuid) to authenticated;
