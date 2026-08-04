alter table public.calendar_integrations
  add column if not exists token_type text,
  add column if not exists scope text,
  add column if not exists access_token_expires_at timestamptz,
  add column if not exists connected_by uuid references auth.users(id) on delete set null,
  add column if not exists last_sync_error text;

create index if not exists calendar_integrations_connected_by_idx
on public.calendar_integrations (connected_by);

revoke select, insert, update
on public.calendar_integrations
from authenticated;

grant select (
  id,
  shop_id,
  provider,
  calendar_id,
  token_type,
  scope,
  access_token_expires_at,
  connected_by,
  last_sync_error,
  connected_at,
  updated_at
)
on public.calendar_integrations
to authenticated;
