-- hair_profiles already existed in the database with a different schema
-- (user_id, hair_type, thickness, water_hardness, color_treated, heat_styled,
-- climate, updated_at). The columns below were added alongside it rather
-- than recreating the table, since porosity and scalp_condition already
-- existed and the table was empty but possibly relied on elsewhere.

alter table hair_profiles
  add column if not exists curl_type text,
  add column if not exists strand_thickness text,
  add column if not exists zip_code text,
  add column if not exists hair_concerns text[];

-- RLS was enabled with no policies, which would block the anon key entirely.
create policy "Allow anon insert"
  on hair_profiles for insert
  to anon
  with check (true);

create policy "Allow anon select"
  on hair_profiles for select
  to anon
  using (true);

-- user_id was NOT NULL, but the app has no auth yet, so the form
-- can't populate it. Made nullable until auth is wired up.
alter table hair_profiles
  alter column user_id drop not null;

-- hair_profiles_porosity_check only allowed low/medium/high, but the
-- form's "not sure" option (with a space, matching the button label)
-- was being rejected. Added it to the allowed values.
alter table hair_profiles
  drop constraint hair_profiles_porosity_check;
alter table hair_profiles
  add constraint hair_profiles_porosity_check
  check (porosity = any (array['low', 'medium', 'high', 'not sure']));

-- hair_profiles_scalp_condition_check only allowed 'dandruff', but the
-- form's button sends 'dandruff-prone' (matching its label). Added it
-- alongside the existing value.
alter table hair_profiles
  drop constraint hair_profiles_scalp_condition_check;
alter table hair_profiles
  add constraint hair_profiles_scalp_condition_check
  check (scalp_condition = any (array['normal', 'dry', 'oily', 'sensitive', 'dandruff', 'dandruff-prone']));
