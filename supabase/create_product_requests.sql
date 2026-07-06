create table if not exists product_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  product_name text not null,
  brand_name text not null,
  where_purchased text,
  ingredient_list text,
  email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table product_requests enable row level security;

-- Anyone (signed in or not) can submit a request, matching the app's
-- other public-facing forms. No select policy is added for anon/
-- authenticated -- submitted emails and ingredient lists are only
-- readable via the Supabase dashboard/service role, not the client.
create policy "Allow anon insert"
  on product_requests for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on product_requests for insert
  to authenticated
  with check (true);
