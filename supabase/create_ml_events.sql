-- Generic event log for ML/analytics instrumentation, starting with the
-- paywall-removal funnel (see lib/mlEvents.ts for the TypeScript side).
-- event_type is intentionally open text rather than an enum -- new event
-- types will keep getting added here as instrumentation grows, and a
-- migration per new type isn't worth it for an events table.
create table if not exists ml_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id),
  -- What the event is about (a product, a brand, ...), when there is one.
  entity_id text,
  entity_type text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- For a table created before entity_id/entity_type existed.
alter table ml_events add column if not exists entity_id text;
alter table ml_events add column if not exists entity_type text;

alter table ml_events enable row level security;

-- Logged from both anonymous searches (search_anonymous) and signed-in
-- ones, and from the client-side Style Match/profile funnel - anon and
-- authenticated both need insert, matching product_searches' own policy
-- shape.
drop policy if exists "Allow anon insert" on ml_events;
create policy "Allow anon insert"
  on ml_events for insert
  to anon
  with check (true);

drop policy if exists "Allow authenticated insert" on ml_events;
create policy "Allow authenticated insert"
  on ml_events for insert
  to authenticated
  with check (true);

-- No select policy - read via the service-role client only (ML
-- training/analytics), same reasoning as brand_applications.

create index if not exists ml_events_event_type_idx on ml_events (event_type, created_at);
create index if not exists ml_events_user_id_idx on ml_events (user_id);
