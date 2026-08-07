-- Named catalog_products, not "products" -- qoyl-business already has its
-- own products table (brand_partner/amazon_asin/verified/last_reviewed --
-- a B2B brand-dashboard schema) in this shared Supabase project. This
-- table is qoyl-beta's own consumer search catalog, referencing
-- catalog_brands (not brands) and the existing shared categories table.
create table if not exists catalog_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references catalog_brands(id),
  category_id uuid references categories(id),
  name text not null,
  barcode text unique,
  size text,
  image_url text,
  country text default 'US',
  is_verified boolean default false,
  source text default 'manual',
  ingredient_list_raw text,
  ingredient_list_normalized text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table catalog_products enable row level security;

-- Public catalog data -- /search queries this table directly with the
-- anon client, falling back to Open Beauty Facts only when this table
-- has no match. Writes only happen through /admin/products via the
-- service role, which bypasses RLS entirely -- no insert/update policy
-- is added here.
create policy "Anyone can read catalog_products"
  on catalog_products for select
  to anon, authenticated
  using (true);
