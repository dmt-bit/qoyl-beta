-- Boo Basket orders (Halloween pop-up, pickup Oct 25 2026) - paste into
-- the Supabase SQL editor. Not run from the app (service-role client
-- can't run DDL).

create table public.boo_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  guest_email text,
  size text not null check (size in ('boo','bigboo')),
  size_price_cents integer not null,
  location text not null check (location in ('logan_square','hyde_park')),
  bonnet_color text not null,
  tool text not null check (tool in ('scalp_massager','detangling_comb','satin_headband')),
  candy boolean not null default true,
  beanie boolean not null default false,
  beanie_color text,
  minis text[] not null default '{}',
  extra_minis integer not null default 0,
  full_size_product text,
  is_gift boolean not null default false,
  gift_recipient_name text,
  gift_note text,
  gift_hair_type text,
  gift_porosity text,
  payment_method text not null check (payment_method in ('auto_charge','tap_to_pay')),
  stripe_payment_intent_id text,
  reservation_paid boolean not null default false,
  status text not null default 'reserved' check (status in ('reserved','ready','collected','cancelled')),
  golden_ticket boolean not null default false
);
alter table public.boo_orders enable row level security;
create policy "Users view own boo orders" on public.boo_orders
  for select using (auth.uid() = user_id);

-- The admin routes below use the service-role client (bypasses RLS for
-- reads), and the reserve route also uses the service-role client for
-- inserts (no anon/authenticated insert policy exists or is needed -
-- the public POST route is the only insert path, and it validates its
-- own inputs server-side).
