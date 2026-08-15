-- Remove legacy Google Calendar objects from older production deployments.
-- Run this manually in Supabase SQL Editor after backing up production data.

drop table if exists public.calendar_integrations cascade;

alter table if exists public.appointments
  drop column if exists google_calendar_event_id,
  drop column if exists google_calendar_name;
