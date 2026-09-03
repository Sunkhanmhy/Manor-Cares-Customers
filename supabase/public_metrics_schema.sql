-- Run this in a separate Supabase project dedicated to public metrics only.
-- This schema is intentionally isolated from the main customer database.

create extension if not exists pgcrypto;

create table if not exists public.metrics_events (
  id bigint generated always as identity primary key,
  metric_type text not null check (metric_type in ('usage', 'booking_requested', 'booking_executed', 'review_positive', 'review_negative')),
  metric_value numeric(12, 2) not null default 1,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists metrics_events_type_idx on public.metrics_events (metric_type);
create index if not exists metrics_events_created_at_idx on public.metrics_events (created_at desc);

alter table public.metrics_events enable row level security;

-- Public read for charting.
drop policy if exists "Public read metrics" on public.metrics_events;
create policy "Public read metrics"
on public.metrics_events
for select
using (true);

-- Public write for counting events from all clients.
drop policy if exists "Public insert metrics" on public.metrics_events;
create policy "Public insert metrics"
on public.metrics_events
for insert
with check (true);
