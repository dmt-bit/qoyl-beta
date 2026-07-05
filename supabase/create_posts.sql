create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('ingredient-evaluation', 'product-comparison', 'response-video', 'general')),
  hero_image_url text,
  excerpt text not null,
  body text not null,
  related_product_name text,
  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "Allow anon select"
  on posts for select
  to anon
  using (true);
