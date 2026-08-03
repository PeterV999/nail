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
with check (
  status = 'pending_request'
  and source = 'customer_request'
  and customer_name <> ''
  and contact_snapshot <> ''
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
grant select on public.public_shops to anon, authenticated;
grant select on public.public_services to anon, authenticated;
grant select on public.public_booking_time_slots to anon, authenticated;
grant select on public.public_booking_day_overrides to anon, authenticated;
grant select on public.public_busy_time_windows to anon, authenticated;
grant insert on public.booking_requests to anon;

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
