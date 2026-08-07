create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  website text,
  instagram text,
  is_indie boolean default false,
  is_black_owned boolean default false,
  shopper_url text,
  created_at timestamptz default now()
);

alter table brands enable row level security;

-- Public catalog data -- /search reads this table directly with the anon
-- client, so anyone needs select access. Writes only happen through the
-- /admin/products routes, which use the service role and therefore
-- bypass RLS entirely -- no insert/update policy is needed.
create policy "Anyone can read brands"
  on brands for select
  to anon, authenticated
  using (true);
