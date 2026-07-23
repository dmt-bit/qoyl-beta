create table if not exists product_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  product_name text,
  brand_name text,
  barcode text,
  compatibility_score integer,
  hair_profile_porosity text,
  hair_profile_curl_type text,
  searched_at timestamptz default now()
);

alter table product_searches enable row level security;

-- Users can read their own search history (used by the "Recently
-- searched" section on /dashboard).
create policy "Users can view own search history"
  on product_searches for select
  to authenticated
  using (auth.uid() = user_id);

-- Insert is allowed for both signed-in and anonymous users -- /search
-- works without an account, and anonymous searches are still valuable
-- for aggregate demand-signal analytics (user_id is left null for them).
create policy "Allow anon insert"
  on product_searches for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on product_searches for insert
  to authenticated
  with check (true);

-- No blanket "service role can read all rows" policy is needed --
-- the service role bypasses RLS entirely, which is exactly how the
-- qoyl-business B2B insights dashboard reads this table (via
-- getSupabaseAdmin(), never the anon/authenticated client).
