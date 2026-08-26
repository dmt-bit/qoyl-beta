-- extension_profiles already exists (confirmed via the live PostgREST
-- schema - unlike baby_profiles/child_profiles in the previous task, this
-- one was actually pre-created). Confirmed via a live insert test that
-- user_id has NO unique constraint, same as baby_profiles/child_profiles -
-- so this follows that exact same RLS pattern rather than hair_profiles'
-- one-row-per-user pattern. Writes go through a service-role API route
-- (app/api/family-profiles/extension), so these authenticated policies
-- are defense-in-depth, matching the existing convention.

create index if not exists extension_profiles_user_id_idx on extension_profiles(user_id);

alter table extension_profiles enable row level security;

drop policy if exists "Authenticated users can insert own extension profiles" on extension_profiles;
create policy "Authenticated users can insert own extension profiles"
  on extension_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can select own extension profiles" on extension_profiles;
create policy "Authenticated users can select own extension profiles"
  on extension_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can update own extension profiles" on extension_profiles;
create policy "Authenticated users can update own extension profiles"
  on extension_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can delete own extension profiles" on extension_profiles;
create policy "Authenticated users can delete own extension profiles"
  on extension_profiles for delete
  to authenticated
  using (auth.uid() = user_id);
