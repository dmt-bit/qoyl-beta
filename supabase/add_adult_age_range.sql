-- Adds the adult age bracket used for compatibility scoring, routine
-- guidance, and dashboard display. This is a NEW, separate column from
-- the existing hair_profiles.age_range, which already stores child/baby
-- age brackets ("0-12 months", "1-3 years", ..., "13+" -- see
-- AGE_RANGE_OPTIONS in app/profile/page.tsx) in a different string
-- format, with no CHECK constraint, and is only ever set when
-- profile_for is "child" or "baby".
--
-- Reusing that column for the new adult brackets would have been a
-- silent no-op (age_range already exists, so `add column if not exists`
-- skips the whole clause -- including the CHECK) and would leave the
-- column holding two incompatible value sets depending on profile_for.
-- A new column keeps both concerns cleanly separated and lets the CHECK
-- constraint actually apply.

alter table hair_profiles
  add column if not exists adult_age_range text
  check (adult_age_range in ('under_18', '18_25', '26_35', '36_45', '46_55', '56_65', '65_plus'));

-- No RLS/policy changes needed -- RLS is row-level, not column-level.
-- Reads already go through lib/hairProfile.ts (anon client, own-row RLS)
-- and lib/compatibility.ts's loadScoringProfile (same); writes go
-- through app/profile/page.tsx's upsert under the user's own session.
