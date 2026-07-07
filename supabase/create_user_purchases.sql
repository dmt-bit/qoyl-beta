create table if not exists user_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  product_type text not null check (product_type in ('routine_subscription', 'travel_kit')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table user_purchases enable row level security;

-- Users can read their own purchase history if ever queried directly from
-- the client. All writes happen server-side via the Stripe webhook using
-- the service role key (which bypasses RLS entirely), so no insert/update
-- policy is added here -- nobody can forge or alter a purchase record
-- through the anon/authenticated client.
create policy "Users can view own purchases"
  on user_purchases for select
  to authenticated
  using (auth.uid() = user_id);
