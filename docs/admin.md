# Platform Admin

## Purpose

`/admin` is the central dashboard for platform-level operators. It is separate from shop workspaces such as `/dashboard/fah-nail` so shop owners keep their normal workflow.

The central dashboard can:

- View overall shop counts and operational status.
- See shops that need attention, including pending requests, missing Calendar setup, inactive shops, Calendar sync errors, and confirmed appointments that have not been sent to Calendar yet.
- Search and filter shops by name, slug, active status, and Google Calendar status.
- Open each shop dashboard.
- Open each public booking page.
- Edit basic shop profile fields: name, phone, LINE, Facebook, and active status.

The central dashboard must not manage shop appointments, services, time slots, or Google Calendar directly.

## PWA Web App

This project is treated as a progressive web app before any native mobile app work.

- `manifest.webmanifest` starts the installed app at `/admin/`.
- `service-worker.js` uses network-first navigation so booking and dashboard pages stay fresh.
- Static assets are cached for faster repeat visits.
- Offline navigation shows a clear offline fallback instead of opening the wrong dashboard route.
- Shortcuts remain available for `/book/fah-nail`, `/dashboard/fah-nail`, and `/admin/`.

## Global Admin Access

Run `supabase/platform-admin.sql` in the Supabase SQL Editor for project `punzqhfrhdgimvmczspv`.

The migration seeds this account as a global admin:

```text
peter091021.v1@gmail.com
```

To add another global admin after that account has logged in once:

```sql
insert into public.platform_admins (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('new-admin@example.com')
on conflict (user_id) do update
set role = excluded.role;
```

To remove a global admin:

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
3. Complete Google Calendar update/retry flow.
4. Add booking-abuse protection.
5. Add multi-staff scheduling.
6. Grow into SaaS features such as shop themes and subscription packages.
