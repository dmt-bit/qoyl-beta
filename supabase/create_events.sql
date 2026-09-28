-- Events system: public /events + /events/[slug], admin management at
-- /admin/events. This is a CREATE TABLE (DDL) - unlike every other SQL
-- file in this project this turn, there is no raw-SQL execution path
-- available to run this automatically (no CLI link, no direct Postgres
-- connection string, no exec_sql RPC - confirmed by testing against the
-- live project, which also confirmed no `events` table already exists).
-- Paste this into the Supabase SQL editor dashboard directly. All of the
-- application code in this commit is written against this exact schema
-- and will work as soon as this has been run.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null,
  short_description text,
  event_date timestamptz not null,
  event_end_date timestamptz,
  location_name text,
  location_address text,
  location_city text,
  is_virtual boolean default false,
  virtual_link text,
  cover_image_url text,
  ticket_price_cents integer default 0,
  stripe_payment_link text,
  capacity integer,
  tickets_sold integer default 0,
  status text default 'draft'
    check (status in ('draft', 'published', 'sold_out', 'cancelled', 'past')),
  is_featured boolean default false,
  tags text[] default array[]::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists events_status_idx on events(status);
create index if not exists events_event_date_idx on events(event_date);
create index if not exists events_featured_idx on events(is_featured);

-- RLS: matches this project's house style (see supabase/create_posts.sql -
-- `create policy "Allow anon select" on <table> for select to anon using
-- (true)`), with one deliberate difference. Posts has no concept of
-- unpublished content, so an unrestricted `using (true)` is fine there.
-- Events has a real 'draft' status meant to be admin-only - relying
-- purely on the app layer's `WHERE status IN (...)` filter would still
-- let anyone with the public anon key query `supabase.from("events")`
-- directly (e.g. from browser dev tools) and see unpublished event
-- details/pricing. The policy itself excludes drafts, so that's
-- protected at the database layer regardless of what any client code
-- does - the app's own queries still filter explicitly on top of this.
alter table events enable row level security;
create policy "Allow anon select" on events for select to anon using (status != 'draft');

-- Admin writes (create/update/delete) all go through the service-role
-- client (getSupabaseAdmin(), which bypasses RLS entirely) via
-- app/api/admin/events/**, the same pattern already used by
-- app/api/admin/products/**. No insert/update/delete policy is needed
-- for anon/authenticated roles since nothing in this feature writes to
-- `events` from the browser.
