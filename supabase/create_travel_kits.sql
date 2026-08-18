-- One row per travel-kit trip/purchase. A user can buy multiple kits
-- (one per trip), so this is intentionally not unique-per-user like
-- hair_profiles. status starts 'pending_payment' at survey submission
-- and flips to 'active' by the Stripe webhook once checkout completes,
-- at which point products (the generated kit) is populated.
create table if not exists travel_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  destination text not null,
  departure_date date,
  return_date date,
  climate text,
  swimming text,
  protective_style text,
  hair_priority text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'cancelled')),
  products jsonb,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

alter table travel_kits enable row level security;

-- Users can read their own kits (both mid-survey pending_payment rows
-- and active/paid ones) -- /travel and the dashboard's "My Travel Kits"
-- section both query this directly with the anon/authenticated client.
create policy "Users can view own travel kits"
  on travel_kits for select
  to authenticated
  using (auth.uid() = user_id);

-- The survey step inserts the pending_payment row directly from the
-- client before redirecting to Stripe.
create policy "Users can insert own travel kits"
  on travel_kits for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update policy for authenticated users -- status/products are only
-- ever updated by the Stripe webhook using the service role key (which
-- bypasses RLS entirely), same pattern as user_purchases. Nobody can
-- forge their own kit as "active" or inject arbitrary products through
-- the anon/authenticated client.
