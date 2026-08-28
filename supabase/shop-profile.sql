alter table public.shops
add column if not exists tagline text,
add column if not exists logo_path text,
add column if not exists theme_key text not null default 'aqua_mint';

alter table public.shops
drop constraint if exists shops_theme_key_valid;

alter table public.shops
add constraint shops_theme_key_valid check (
  theme_key in (
    'aqua_mint',
    'ocean_pastel',
    'candy_cloud',
    'soft_blush',
    'warm_nail',
    'sky_peach',
    'lavender_mint',
    'fresh_mint',
    'sparkle_light',
    'clean_blue_lavender'
  )
);

create or replace view public.public_shops as
select id, name, slug, status, phone, line_id, facebook_page, tagline, logo_path, theme_key
from public.shops
where status = 'active';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-logos',
  'shop-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can read shop logos" on storage.objects;
drop policy if exists "shop members can upload shop logos" on storage.objects;
drop policy if exists "shop members can update shop logos" on storage.objects;
drop policy if exists "shop members can delete shop logos" on storage.objects;

create policy "public can read shop logos"
on storage.objects for select
using (bucket_id = 'shop-logos');

create policy "shop members can upload shop logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'shop-logos'
  and public.is_shop_member(((storage.foldername(name))[1])::uuid)
);

create policy "shop members can update shop logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'shop-logos'
  and public.is_shop_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'shop-logos'
  and public.is_shop_member(((storage.foldername(name))[1])::uuid)
);

create policy "shop members can delete shop logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'shop-logos'
  and public.is_shop_member(((storage.foldername(name))[1])::uuid)
);

drop function if exists public.list_accessible_shops();
drop function if exists public.update_platform_shop_settings(uuid, text, text, text, text, text);
drop function if exists public.update_platform_shop_settings(uuid, text, text, text, text, text, text);
drop function if exists public.update_platform_shop_settings(uuid, text, text, text, text, text, text, text);

create or replace function public.list_accessible_shops()
returns table(
  id uuid,
  name text,
  slug text,
  status text,
  phone text,
  line_id text,
  facebook_page text,
  tagline text,
  logo_path text,
  theme_key text,
  role text,
  pending_requests integer,
  today_appointments integer,
  tomorrow_appointments integer,
  upcoming_appointments integer,
  created_at timestamptz,
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
    shops.tagline,
    shops.logo_path,
    shops.theme_key,
    case when actor.is_admin then 'platform_admin' else shop_members.role end as role,
    coalesce(request_counts.pending_requests, 0)::integer as pending_requests,
    coalesce(appointment_counts.today_appointments, 0)::integer as today_appointments,
    coalesce(appointment_counts.tomorrow_appointments, 0)::integer as tomorrow_appointments,
    coalesce(appointment_counts.upcoming_appointments, 0)::integer as upcoming_appointments,
    shops.created_at,
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
    select
      count(*) filter (
        where appointments.appointment_date = ((now() at time zone 'Asia/Bangkok')::date)
          and appointments.status <> 'cancelled'
      ) as today_appointments,
      count(*) filter (
        where appointments.appointment_date = (((now() at time zone 'Asia/Bangkok')::date) + 1)
          and appointments.status <> 'cancelled'
      ) as tomorrow_appointments,
      count(*) filter (
        where appointments.appointment_date >= ((now() at time zone 'Asia/Bangkok')::date)
          and appointments.appointment_date < (((now() at time zone 'Asia/Bangkok')::date) + 7)
          and appointments.status <> 'cancelled'
      ) as upcoming_appointments
    from public.appointments
    where appointments.shop_id = shops.id
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
  shop_status text default 'active',
  shop_tagline text default null,
  shop_theme_key text default 'aqua_mint'
)
returns table(
  id uuid,
  name text,
  slug text,
  status text,
  phone text,
  line_id text,
  facebook_page text,
  tagline text,
  logo_path text,
  theme_key text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := nullif(btrim(shop_name), '');
  clean_status text := lower(btrim(coalesce(shop_status, 'active')));
  clean_theme_key text := lower(btrim(coalesce(shop_theme_key, 'aqua_mint')));
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

  if clean_theme_key not in (
    'aqua_mint',
    'ocean_pastel',
    'candy_cloud',
    'soft_blush',
    'warm_nail',
    'sky_peach',
    'lavender_mint',
    'fresh_mint',
    'sparkle_light',
    'clean_blue_lavender'
  ) then
    raise exception 'SHOP_THEME_INVALID' using errcode = '22023';
  end if;

  return query
  update public.shops
  set
    name = clean_name,
    phone = nullif(btrim(shop_phone), ''),
    line_id = nullif(btrim(shop_line_id), ''),
    facebook_page = nullif(btrim(shop_facebook_page), ''),
    tagline = nullif(btrim(shop_tagline), ''),
    theme_key = clean_theme_key,
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
    shops.tagline,
    shops.logo_path,
    shops.theme_key,
    shops.updated_at;
end;
$$;

grant execute on function public.list_accessible_shops() to authenticated;
grant execute on function public.update_platform_shop_settings(uuid, text, text, text, text, text, text, text) to authenticated;
