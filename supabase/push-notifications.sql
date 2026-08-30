create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "members manage own push subscriptions" on public.push_subscriptions;
create policy "members manage own push subscriptions"
on public.push_subscriptions for all
to authenticated
using (
  user_id = (select auth.uid())
  and public.is_shop_member(shop_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_shop_member(shop_id)
);

create index if not exists push_subscriptions_shop_id_idx on public.push_subscriptions (shop_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_active_idx on public.push_subscriptions (shop_id, is_active);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
