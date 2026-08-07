create table if not exists product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  ingredient_id uuid references ingredients(id),
  position integer not null,
  created_at timestamptz default now(),
  unique (product_id, ingredient_id)
);

alter table product_ingredients enable row level security;

-- Populated by /admin/products (via the service role) whenever a raw
-- ingredient list is parsed and matched. Not read directly by the client
-- today -- /search reads products.ingredient_list_normalized instead --
-- but kept selectable for future per-ingredient admin views.
create policy "Anyone can read product_ingredients"
  on product_ingredients for select
  to anon, authenticated
  using (true);
