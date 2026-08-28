# Platform Admin

## Purpose

`/admin` is the central dashboard for platform-level operators. It is separate from shop workspaces such as `/fah-owner` so shop owners keep their normal workflow.

The central dashboard can:

- View overall shop counts and operational status.
- See shops that need attention, including pending requests and inactive shops.
- Search and filter shops by name, slug, and active status.
- Open each shop dashboard.
- Open each public booking page.
- Edit basic shop profile fields: name, phone, LINE, Facebook, and active status.

The central dashboard must not manage shop appointments, services, or time slots directly.

## PWA Web App

This project is treated as a progressive web app before any native mobile app work.

- `manifest.webmanifest` starts the installed app at `/admin/`.
- `service-worker.js` uses network-first navigation so booking and dashboard pages stay fresh.
- Static assets are cached for faster repeat visits.
- Offline navigation shows a clear offline fallback instead of opening the wrong dashboard route.
- Shortcuts remain available for `/fah`, `/fah-owner`, and `/admin/`.

## Platform Admin Access

Run `supabase/platform-admin.sql` in the Supabase SQL Editor for project `punzqhfrhdgimvmczspv`.

The migration seeds this account as a platform admin:

```text
peter091021.v1@gmail.com
```

To add another platform admin after that account has logged in once:

```sql
insert into public.platform_admins (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('new-admin@example.com')
on conflict (user_id) do update
set role = excluded.role;
```

To remove a platform admin:

```sql
delete from public.platform_admins
where user_id in (
  select id
  from auth.users
  where lower(email) = lower('admin-to-remove@example.com')
);
```

## Roadmap

1. PWA installability and richer `/admin` dashboard.
2. Improve shop dashboard layout for daily shop operations.
3. Add in-app notifications for booking requests and upcoming appointments.
4. Add booking-abuse protection.
5. Add multi-staff scheduling.
6. Grow into SaaS features such as subscription packages and deeper shop customization.

## Shop Themes

Platform admins can assign a fixed theme to each shop from `/admin`. The theme affects the customer booking page and the shop owner dashboard for that shop.

Run `supabase/shop-themes.sql` before using theme saving in production. Shops that do not have a saved theme use `aqua_mint`.
