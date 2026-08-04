create extension if not exists "pgcrypto";

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone text,
  line_id text,
  facebook_page text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  line_id text,
  facebook_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_time_slots (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_time_slots_valid_range check (start_time < end_time)
);

create table public.booking_day_overrides (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  date date not null,
  is_closed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, date)
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null default '',
  contact_snapshot text not null default '',
  booking_date date not null,
  preferred_time_window text not null,
  selected_service_ids uuid[] not null default '{}',
  customer_note text,
  status text not null default 'pending_request',
  source text not null default 'customer_request',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  selected_service_ids uuid[] not null default '{}',
  status text not null default 'confirmed',
  source text not null,
  google_calendar_event_id text,
  google_calendar_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_range check (start_time < end_time)
);

create table public.calendar_integrations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  provider text not null default 'google',
  calendar_id text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, provider)
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  image_url text not null,
  caption text,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.booking_time_slots enable row level security;
alter table public.booking_day_overrides enable row level security;
alter table public.booking_requests enable row level security;
alter table public.staff enable row level security;
alter table public.shop_members enable row level security;
alter table public.appointments enable row level security;
alter table public.calendar_integrations enable row level security;
alter table public.portfolio_items enable row level security;

create or replace function public.is_shop_member(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shop_members
    where shop_members.shop_id = target_shop_id
      and shop_members.user_id = auth.uid()
  );
$$;

create or replace function public.is_active_shop(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shops
    where shops.id = target_shop_id
      and shops.status = 'active'
  );
$$;

create policy "public can read active shops"
on public.shops for select
using (status = 'active');

create policy "owners can manage shops"
on public.shops for all
using (public.is_shop_member(id))
with check (public.is_shop_member(id));

create policy "public can read active services"
on public.services for select
using (is_active = true);

create policy "owners can manage services"
on public.services for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "public can read active booking slots"
on public.booking_time_slots for select
using (is_active = true);

create policy "owners can manage booking slots"
on public.booking_time_slots for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "public can read booking day closures"
on public.booking_day_overrides for select
using (is_closed = true);

create policy "owners can manage booking day overrides"
on public.booking_day_overrides for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "public can create booking requests"
on public.booking_requests for insert
to anon, authenticated
with check (
  status in ('pending_request', 'pending')
  and source = 'customer_request'
  and nullif(trim(customer_name), '') is not null
  and nullif(trim(contact_snapshot), '') is not null
  and public.is_active_shop(shop_id)
);

create policy "owners can manage booking requests"
on public.booking_requests for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "owners can manage customers"
on public.customers for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "owners can manage staff"
on public.staff for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "members can read own membership"
on public.shop_members for select
using (user_id = auth.uid());

create policy "owners can manage appointments"
on public.appointments for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "owners can manage calendar integrations"
on public.calendar_integrations for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create policy "public can read portfolio items"
on public.portfolio_items for select
using (is_public = true);

create policy "owners can manage portfolio items"
on public.portfolio_items for all
using (public.is_shop_member(shop_id))
with check (public.is_shop_member(shop_id));

create or replace view public.public_shops as
select id, name, slug, status
from public.shops
where status = 'active';

create or replace view public.public_services as
select id, shop_id, name, is_active, sort_order
from public.services
where is_active = true;

create or replace view public.public_booking_time_slots as
select id, shop_id, start_time, end_time, is_active, sort_order
from public.booking_time_slots
where is_active = true;

create or replace view public.public_booking_day_overrides as
select shop_id, date, is_closed
from public.booking_day_overrides
where is_closed = true;

create or replace view public.public_busy_time_windows as
select
  shop_id,
  appointment_date,
  to_char(start_time, 'HH24:MI') || '-' || to_char(end_time, 'HH24:MI') as time_window
from public.appointments
where status = 'confirmed';

grant usage on schema public to anon, authenticated;
grant execute on function public.is_active_shop(uuid) to anon, authenticated;
grant select on public.public_shops to anon, authenticated;
grant select on public.public_services to anon, authenticated;
grant select on public.public_booking_time_slots to anon, authenticated;
grant select on public.public_booking_day_overrides to anon, authenticated;
grant select on public.public_busy_time_windows to anon, authenticated;
grant insert on public.booking_requests to anon;
grant insert on public.booking_requests to authenticated;
grant select, update on public.shops to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.booking_time_slots to authenticated;
grant select, insert, update, delete on public.booking_day_overrides to authenticated;
grant select, update, delete on public.booking_requests to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.calendar_integrations to authenticated;
grant select, insert, update, delete on public.portfolio_items to authenticated;
grant select on public.shop_members to authenticated;

create or replace function public.register_shop(
  shop_name text,
  requested_slug text
)
returns table(id uuid, name text, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  clean_name text := nullif(trim(shop_name), '');
  clean_slug text := lower(trim(requested_slug));
  candidate_slug text;
  suffix integer := 0;
  created_shop_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if clean_name is null then
    raise exception 'Shop name is required' using errcode = '22023';
  end if;

  clean_slug := regexp_replace(coalesce(clean_slug, ''), '[^a-z0-9-]+', '-', 'g');
  clean_slug := regexp_replace(clean_slug, '(^-+|-+$)', '', 'g');
  clean_slug := regexp_replace(clean_slug, '-{2,}', '-', 'g');

  if length(clean_slug) < 3 then
    clean_slug := 'shop-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  if length(clean_slug) > 48 then
    clean_slug := substr(clean_slug, 1, 48);
    clean_slug := regexp_replace(clean_slug, '(-+$)', '', 'g');
  end if;

  candidate_slug := clean_slug;

  while exists (select 1 from public.shops where shops.slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := substr(clean_slug, 1, 44) || '-' || suffix::text;
  end loop;

  insert into public.shops (name, slug, status)
  values (clean_name, candidate_slug, 'active')
  returning shops.id into created_shop_id;

  insert into public.shop_members (shop_id, user_id, role)
  values (created_shop_id, actor_id, 'owner');

  insert into public.services (shop_id, name, sort_order)
  values
    (created_shop_id, 'สีเจล', 10),
    (created_shop_id, 'เพ้นท์ลาย', 20),
    (created_shop_id, 'ต่อเล็บ', 30),
    (created_shop_id, 'สปามือ', 40),
    (created_shop_id, 'สปาเท้า', 50);

  insert into public.booking_time_slots (shop_id, start_time, end_time, sort_order)
  values
    (created_shop_id, '08:00'::time, '10:00'::time, 10),
    (created_shop_id, '10:00'::time, '12:00'::time, 20),
    (created_shop_id, '12:00'::time, '14:00'::time, 30),
    (created_shop_id, '14:00'::time, '16:00'::time, 40),
    (created_shop_id, '16:00'::time, '18:00'::time, 50),
    (created_shop_id, '18:00'::time, '20:00'::time, 60),
    (created_shop_id, '20:00'::time, '22:00'::time, 70);

  return query
  select shops.id, shops.name, shops.slug
  from public.shops
  where shops.id = created_shop_id;
end;
$$;

revoke all on function public.register_shop(text, text) from public;
revoke all on function public.register_shop(text, text) from anon;
revoke all on function public.register_shop(text, text) from authenticated;
grant execute on function public.register_shop(text, text) to authenticated;

create or replace function public.create_booking_request(
  shop_slug text,
  customer_name text,
  contact_snapshot text,
  booking_date date,
  preferred_time_window text,
  selected_service_ids uuid[],
  customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_shop_id uuid;
  clean_name text := nullif(btrim(customer_name), '');
  clean_contact text := lower(nullif(btrim(contact_snapshot), ''));
  clean_window text := nullif(btrim(preferred_time_window), '');
  clean_services uuid[] := coalesce(selected_service_ids, '{}'::uuid[]);
  new_request_id uuid;
begin
  select shops.id
  into target_shop_id
  from public.shops
  where shops.slug = btrim(shop_slug)
    and shops.status = 'active';

  if target_shop_id is null then
    raise exception 'SHOP_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if clean_name is null or clean_contact is null or clean_window is null then
    raise exception 'BOOKING_REQUEST_REQUIRED_FIELDS' using errcode = 'P0001';
  end if;

  if array_length(clean_services, 1) is null then
    raise exception 'BOOKING_REQUEST_SERVICE_REQUIRED' using errcode = 'P0001';
  end if;

  if booking_date < current_date then
    raise exception 'BOOKING_DATE_IN_PAST' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from unnest(clean_services) as requested_service_id
    where not exists (
      select 1
      from public.services
      where services.id = requested_service_id
        and services.shop_id = target_shop_id
        and services.is_active = true
    )
  ) then
    raise exception 'BOOKING_REQUEST_INVALID_SERVICE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.booking_day_overrides
    where booking_day_overrides.shop_id = target_shop_id
      and booking_day_overrides.date = booking_date
      and booking_day_overrides.is_closed = true
  ) then
    raise exception 'BOOKING_SLOT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.booking_time_slots
    where booking_time_slots.shop_id = target_shop_id
      and booking_time_slots.is_active = true
      and to_char(booking_time_slots.start_time, 'HH24:MI') || '-' || to_char(booking_time_slots.end_time, 'HH24:MI') = clean_window
  ) then
    raise exception 'BOOKING_SLOT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.appointments
    where appointments.shop_id = target_shop_id
      and appointments.appointment_date = booking_date
      and appointments.status = 'confirmed'
      and to_char(appointments.start_time, 'HH24:MI') || '-' || to_char(appointments.end_time, 'HH24:MI') = clean_window
  ) then
    raise exception 'BOOKING_SLOT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.booking_requests
    where booking_requests.shop_id = target_shop_id
      and booking_requests.booking_date = create_booking_request.booking_date
      and booking_requests.preferred_time_window = clean_window
      and lower(btrim(booking_requests.contact_snapshot)) = clean_contact
      and booking_requests.status in ('pending_request', 'contacted', 'no_answer')
  ) then
    raise exception 'DUPLICATE_BOOKING_REQUEST' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.booking_requests
    where booking_requests.shop_id = target_shop_id
      and lower(btrim(booking_requests.contact_snapshot)) = clean_contact
      and booking_requests.created_at > now() - interval '15 minutes'
      and booking_requests.status in ('pending_request', 'contacted', 'no_answer')
  ) >= 3 then
    raise exception 'BOOKING_REQUEST_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.booking_requests (
    shop_id,
    customer_name,
    contact_snapshot,
    booking_date,
    preferred_time_window,
    selected_service_ids,
    customer_note,
    status,
    source
  )
  values (
    target_shop_id,
    clean_name,
    btrim(contact_snapshot),
    create_booking_request.booking_date,
    clean_window,
    clean_services,
    nullif(btrim(customer_note), ''),
    'pending_request',
    'customer_request'
  )
  returning id into new_request_id;

  return new_request_id;
end;
$$;

revoke all on function public.create_booking_request(text, text, text, date, text, uuid[], text) from public;
revoke all on function public.create_booking_request(text, text, text, date, text, uuid[], text) from anon;
revoke all on function public.create_booking_request(text, text, text, date, text, uuid[], text) from authenticated;
grant execute on function public.create_booking_request(text, text, text, date, text, uuid[], text) to anon, authenticated;

drop policy if exists "public can create booking requests" on public.booking_requests;
revoke insert on public.booking_requests from anon;
revoke insert on public.booking_requests from authenticated;

create index if not exists shop_members_user_id_idx on public.shop_members (user_id);
create index if not exists booking_requests_shop_status_date_idx on public.booking_requests (shop_id, status, booking_date);
create index if not exists appointments_shop_date_status_idx on public.appointments (shop_id, appointment_date, status);
create index if not exists services_shop_sort_idx on public.services (shop_id, sort_order);
create index if not exists booking_time_slots_shop_sort_idx on public.booking_time_slots (shop_id, sort_order);
create unique index if not exists booking_requests_pending_dedupe_idx
on public.booking_requests (
  shop_id,
  booking_date,
  preferred_time_window,
  lower(btrim(contact_snapshot))
)
where status in ('pending_request', 'contacted', 'no_answer');

insert into public.shops (name, slug, phone, line_id)
values ('Fah Nail', 'fah-nail', '08x-xxx-xxxx', '@fahnail')
on conflict (slug) do nothing;

insert into public.services (shop_id, name, sort_order)
select shops.id, service_name, sort_order
from public.shops
cross join (
  values
    ('สีเจล', 10),
    ('เพ้นท์ลาย', 20),
    ('ต่อเล็บ', 30),
    ('สปามือ', 40),
    ('สปาเท้า', 50)
) as seed_services(service_name, sort_order)
where shops.slug = 'fah-nail'
  and not exists (
    select 1
    from public.services
    where services.shop_id = shops.id
      and services.name = seed_services.service_name
  );

insert into public.booking_time_slots (shop_id, start_time, end_time, sort_order)
select shops.id, start_time::time, end_time::time, sort_order
from public.shops
cross join (
  values
    ('08:00', '10:00', 10),
    ('10:00', '12:00', 20),
    ('12:00', '14:00', 30),
    ('14:00', '16:00', 40),
    ('16:00', '18:00', 50),
    ('18:00', '20:00', 60),
    ('20:00', '22:00', 70)
) as seed_slots(start_time, end_time, sort_order)
where shops.slug = 'fah-nail'
  and not exists (
    select 1
    from public.booking_time_slots
    where booking_time_slots.shop_id = shops.id
      and booking_time_slots.start_time = seed_slots.start_time::time
      and booking_time_slots.end_time = seed_slots.end_time::time
  );
