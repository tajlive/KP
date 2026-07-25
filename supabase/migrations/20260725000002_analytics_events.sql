-- analytics_events: enkel event-tracking for /api/analytics/track + /api/analytics/event.
-- Insert er apen for anon/authenticated (side-visninger fra uinnloggede),
-- select kun service_role (data leses kun server-side/admin).
-- Merk: koert direkte i prod via Supabase Management API 2026-07-25.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  event_type text not null default 'page_view',
  event_name text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created on public.analytics_events(created_at desc);
create index if not exists idx_analytics_events_user on public.analytics_events(user_id) where user_id is not null;

alter table public.analytics_events enable row level security;

drop policy if exists analytics_insert_all on public.analytics_events;
create policy analytics_insert_all on public.analytics_events
  for insert to anon, authenticated, service_role
  with check (true);

drop policy if exists analytics_select_service on public.analytics_events;
create policy analytics_select_service on public.analytics_events
  for select to service_role
  using (true);

revoke update, delete on public.analytics_events from anon, authenticated;
