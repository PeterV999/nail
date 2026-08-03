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
alter table public.appointments enable row level security;
alter table public.calendar_integrations enable row level security;
alter table public.portfolio_items enable row level security;

insert into public.shops (name, slug, phone, line_id)
values ('Fah Nail', 'fah-nail', '08x-xxx-xxxx', '@fahnail')
on conflict (slug) do nothing;
