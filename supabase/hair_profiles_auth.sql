-- Supabase issues signed-in users a JWT with role "authenticated", not
-- "anon" -- the existing anon-only policies (see hair_profiles.sql) don't
-- apply to them at all. Each authenticated user is scoped to their own
-- row via auth.uid() = user_id.

create policy "Authenticated users can insert own profile"
  on hair_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can select own profile"
  on hair_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can update own profile"
  on hair_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One profile per authenticated user, enforced so the app can upsert on
-- user_id. NULLs (anonymous v1 rows) are unaffected -- Postgres treats
-- NULL as distinct from NULL in a unique constraint, so multiple
-- anonymous rows with a null user_id are still allowed.
alter table hair_profiles
  add constraint hair_profiles_user_id_key unique (user_id);
