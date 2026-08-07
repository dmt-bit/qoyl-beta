-- Named catalog_product_ingredients, not "product_ingredients" --
-- qoyl-business already has its own product_ingredients table (with
-- raw_label_text/position_in_list/is_resolved columns, tied to its own
-- products table) in this shared Supabase project. This table is
-- qoyl-beta's own join table, tied to catalog_products.
create table if not exists catalog_product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references catalog_products(id),
  ingredient_id uuid references ingredients(id),
  position integer not null,
  created_at timestamptz default now(),
  unique (product_id, ingredient_id)
);

alter table catalog_product_ingredients enable row level security;

-- Populated by /admin/products (via the service role) whenever a raw
-- ingredient list is parsed and matched. Not read directly by the client
-- today -- /search reads catalog_products.ingredient_list_normalized
-- instead -- but kept selectable for future per-ingredient admin views.
create policy "Anyone can read catalog_product_ingredients"
  on catalog_product_ingredients for select
  to anon, authenticated
  using (true);
