create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "platform admins read audit logs" on public.admin_audit_logs;
create policy "platform admins read audit logs"
on public.admin_audit_logs for select
to authenticated
using (public.is_platform_admin((select auth.uid())));

drop policy if exists "shop owners read own audit logs" on public.admin_audit_logs;
create policy "shop owners read own audit logs"
on public.admin_audit_logs for select
to authenticated
using (
  shop_id is not null
  and public.is_shop_member(shop_id)
);

create index if not exists admin_audit_logs_shop_id_idx on public.admin_audit_logs (shop_id, created_at desc);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_user_id, created_at desc);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs (action, created_at desc);

revoke all on public.admin_audit_logs from anon;
grant select on public.admin_audit_logs to authenticated;

create table if not exists public.app_activity_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'anonymous',
  surface text not null,
  event_name text not null,
  route_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint app_activity_logs_surface_check check (
    surface in ('customer_booking', 'owner_dashboard', 'platform_admin', 'register')
  ),
  constraint app_activity_logs_event_check check (char_length(event_name) between 3 and 80)
);

alter table public.app_activity_logs enable row level security;

drop policy if exists "public can create safe app activity logs" on public.app_activity_logs;
create policy "public can create safe app activity logs"
on public.app_activity_logs for insert
to anon, authenticated
with check (
  actor_user_id is null
  or actor_user_id = (select auth.uid())
);

drop policy if exists "platform admins read all app activity logs" on public.app_activity_logs;
create policy "platform admins read all app activity logs"
on public.app_activity_logs for select
to authenticated
using (public.is_platform_admin((select auth.uid())));

drop policy if exists "shop members read own app activity logs" on public.app_activity_logs;
create policy "shop members read own app activity logs"
on public.app_activity_logs for select
to authenticated
using (
  shop_id is not null
  and public.is_shop_member(shop_id)
);

create index if not exists app_activity_logs_shop_created_idx on public.app_activity_logs (shop_id, created_at desc);
create index if not exists app_activity_logs_surface_created_idx on public.app_activity_logs (surface, created_at desc);
create index if not exists app_activity_logs_actor_created_idx on public.app_activity_logs (actor_user_id, created_at desc);

grant insert on public.app_activity_logs to anon;
grant insert, select on public.app_activity_logs to authenticated;
