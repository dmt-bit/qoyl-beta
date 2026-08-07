create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  hair_types text[],
  created_at timestamptz default now()
);

alter table categories enable row level security;

create policy "Anyone can read categories"
  on categories for select
  to anon, authenticated
  using (true);
