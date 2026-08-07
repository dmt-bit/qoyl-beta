create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id),
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

alter table products enable row level security;

-- Public catalog data -- /search queries this table directly with the
-- anon client, falling back to Open Beauty Facts only when this table
-- has no match. Writes only happen through /admin/products via the
-- service role, which bypasses RLS entirely -- no insert/update policy
-- is added here.
create policy "Anyone can read products"
  on products for select
  to anon, authenticated
  using (true);
