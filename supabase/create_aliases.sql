create table if not exists aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid references ingredients(id),
  alias text not null unique,
  source text default 'manual',
  created_at timestamptz default now()
);

alter table aliases enable row level security;

-- Read by both the /admin/products ingredient-matching flow and, via
-- lib/compatibility.ts's alias-aware matching, the regular /search
-- compatibility scoring flow -- both query this from the client with
-- the anon key.
create policy "Anyone can read aliases"
  on aliases for select
  to anon, authenticated
  using (true);
