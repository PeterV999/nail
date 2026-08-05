create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id is not null
    and exists (
      select 1
      from public.platform_admins
      where platform_admins.user_id = target_user_id
    );
$$;

create or replace function public.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(auth.uid());
$$;

create or replace function public.is_shop_member(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin(auth.uid()) or exists (
    select 1
    from public.shop_members
    where shop_members.shop_id = target_shop_id
      and shop_members.user_id = auth.uid()
  );
$$;

drop policy if exists "platform admins can read own admin status" on public.platform_admins;
create policy "platform admins can read own admin status"
on public.platform_admins for select
using (user_id = auth.uid());

create or replace function public.get_shop_access(shop_slug text)
returns table(
  id uuid,
  name text,
  slug text,
  status text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    shops.id,
    shops.name,
    shops.slug,
    shops.status,
    case
      when public.is_platform_admin(auth.uid()) then 'platform_admin'
      else shop_members.role
    end as role
  from public.shops
  left join public.shop_members
    on shop_members.shop_id = shops.id
   and shop_members.user_id = auth.uid()
  where shops.slug = btrim(shop_slug)
    and (
      public.is_platform_admin(auth.uid())
      or shop_members.user_id = auth.uid()
    )
  limit 1;
$$;

create or replace function public.list_accessible_shops()
returns table(
  id uuid,
  name text,
  slug text,
  status text,
  phone text,
  line_id text,
  facebook_page text,
  role text,
  pending_requests integer,
  today_appointments integer,
  calendar_connected boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select auth.uid() as user_id, public.is_platform_admin(auth.uid()) as is_admin
  )
  select
    shops.id,
    shops.name,
    shops.slug,
    shops.status,
    shops.phone,
    shops.line_id,
    shops.facebook_page,
    case when actor.is_admin then 'platform_admin' else shop_members.role end as role,
    coalesce(request_counts.pending_requests, 0)::integer as pending_requests,
    coalesce(appointment_counts.today_appointments, 0)::integer as today_appointments,
    exists (
      select 1
      from public.calendar_integrations
      where calendar_integrations.shop_id = shops.id
        and calendar_integrations.provider = 'google'
        and calendar_integrations.refresh_token_encrypted is not null
    ) as calendar_connected,
    shops.updated_at
  from public.shops
  cross join actor
  left join public.shop_members
    on shop_members.shop_id = shops.id
   and shop_members.user_id = actor.user_id
  left join lateral (
    select count(*) as pending_requests
    from public.booking_requests
    where booking_requests.shop_id = shops.id
      and booking_requests.status = 'pending_request'
  ) request_counts on true
  left join lateral (
    select count(*) as today_appointments
    from public.appointments
    where appointments.shop_id = shops.id
      and appointments.appointment_date = ((now() at time zone 'Asia/Bangkok')::date)
      and appointments.status <> 'cancelled'
  ) appointment_counts on true
  where actor.user_id is not null
    and (actor.is_admin or shop_members.user_id = actor.user_id)
  order by shops.created_at asc;
$$;

create or replace function public.update_platform_shop_settings(
  target_shop_id uuid,
  shop_name text,
  shop_phone text default null,
  shop_line_id text default null,
  shop_facebook_page text default null,
  shop_status text default 'active'
)
returns table(
  id uuid,
  name text,
  slug text,
  status text,
  phone text,
  line_id text,
  facebook_page text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := nullif(btrim(shop_name), '');
  clean_status text := lower(btrim(coalesce(shop_status, 'active')));
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if clean_name is null then
    raise exception 'SHOP_NAME_REQUIRED' using errcode = '22023';
  end if;

  if clean_status not in ('active', 'inactive') then
    raise exception 'SHOP_STATUS_INVALID' using errcode = '22023';
  end if;

  return query
  update public.shops
  set
    name = clean_name,
    phone = nullif(btrim(shop_phone), ''),
    line_id = nullif(btrim(shop_line_id), ''),
    facebook_page = nullif(btrim(shop_facebook_page), ''),
    status = clean_status,
    updated_at = now()
  where shops.id = target_shop_id
  returning
    shops.id,
    shops.name,
    shops.slug,
    shops.status,
    shops.phone,
    shops.line_id,
    shops.facebook_page,
    shops.updated_at;
end;
$$;

grant execute on function public.is_platform_admin(uuid) to authenticated;
grant execute on function public.current_user_is_platform_admin() to authenticated;
grant execute on function public.get_shop_access(text) to authenticated;
grant execute on function public.list_accessible_shops() to authenticated;
grant execute on function public.update_platform_shop_settings(uuid, text, text, text, text, text) to authenticated;
grant select on public.platform_admins to authenticated;

create index if not exists platform_admins_role_idx on public.platform_admins (role);

insert into public.platform_admins (user_id, role)
select auth.users.id, 'admin'
from auth.users
where lower(auth.users.email) = lower('peter091021.v1@gmail.com')
on conflict (user_id) do update
set role = excluded.role;

insert into public.shop_members (shop_id, user_id, role)
select shops.id, auth.users.id, 'owner'
from public.shops
cross join auth.users
where lower(auth.users.email) = lower('peter091021.v1@gmail.com')
on conflict (shop_id, user_id) do update
set role = excluded.role;
