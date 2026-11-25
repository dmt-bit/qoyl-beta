-- store_orders: tracks every Qoyl Store purchase
-- Qoyl buys the shelf items on behalf of the user (personal shopper model)

create table if not exists public.store_orders (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  user_id           uuid not null references auth.users(id) on delete cascade,
  cart_id           text not null,
  stripe_session_id text,

  -- status lifecycle:
  --   pending_payment → paid → fulfilling → shipped → completed
  --                                              ↘ cancelled (any stage)
  status            text not null default 'pending_payment'
                    check (status in ('pending_payment','paid','fulfilling','shipped','completed','cancelled')),

  -- full snapshot of shelf items at checkout time (CartItem[])
  items             jsonb not null default '[]',

  -- money
  subtotal_usd      numeric(10,2) not null default 0,
  service_fee_usd   numeric(10,2) not null default 0,
  total_usd         numeric(10,2) not null default 0,

  -- shipping destination (may be collected by Stripe if not pre-filled)
  shipping_address  jsonb,
  tracking_number   text
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger store_orders_updated_at
  before update on public.store_orders
  for each row execute procedure public.set_updated_at();

-- RLS: users can read their own orders; admins (service role) can read all
alter table public.store_orders enable row level security;

create policy "Users can view their own store orders"
  on public.store_orders for select
  using (auth.uid() = user_id);

-- Service role (used by API routes via getSupabaseAdmin) bypasses RLS
-- so no additional insert/update policies needed for the API layer.

-- Indexes
create index if not exists store_orders_user_id_idx on public.store_orders (user_id);
create index if not exists store_orders_status_idx  on public.store_orders (status);
create index if not exists store_orders_created_at_idx on public.store_orders (created_at desc);
