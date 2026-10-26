-- "Complete your look" cart.
--
-- Also run supabase/add_install_type_fields.sql if you haven't yet -
-- it's what actually adds style_matches.install_type (confirmed
-- missing live: "column style_matches.install_type does not exist").
-- That's a separate, already-finished, uncommitted feature sitting in
-- this working tree (lib/installTypes.ts, app/api/style-match/
-- install-type/route.ts, the style-match summary page) that this
-- cart's whole trigger point - "after a user... selects an install
-- type" - depends on. Not duplicated here.

create table if not exists style_cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  style_match_id uuid references style_matches(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Each item: { product_id, product_name, product_type, seller_type,
  -- seller_url, affiliate_url, price_estimate, compat_score, quantity,
  -- status, tutorial_url?, internal_video_id? } - see lib/styleCart.ts's
  -- CartItem type for the authoritative shape.
  items jsonb not null default '[]'::jsonb,
  checkout_status text not null default 'draft' check (checkout_status in ('draft', 'shared', 'purchased'))
);

alter table style_cart enable row level security;

-- Public read with no login - this is the whole point of /look/[id]
-- (item 5, the share link). Nothing here is sensitive (no price the
-- user paid, no payment info - carts never touch payment, every
-- purchase happens off-platform on the seller's own site).
drop policy if exists "Anyone can view a cart" on style_cart;
create policy "Anyone can view a cart" on style_cart
  for select using (true);

-- Writes only ever happen through API routes using the service-role
-- client (see app/api/style-cart/route.ts), same pattern as
-- boo_orders/events - no anon/authenticated insert or update policy
-- needed.
