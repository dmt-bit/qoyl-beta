-- "Who is this profile for?" + age range + hair goals, as requested.
alter table hair_profiles add column if not exists profile_for text default 'myself'
  check (profile_for in ('myself', 'child', 'baby'));
alter table hair_profiles add column if not exists age_range text;
alter table hair_profiles add column if not exists hair_goals text[];

-- Not part of the original request, but required for the feature to work:
-- item 2 says to show the men's hair-goals question "when 'Myself' is
-- selected and the user is male (detect from a new optional field)" --
-- that field doesn't exist yet. Added as a simple, optional, non-required
-- field (never required to fill out, never blocks saving the profile).
alter table hair_profiles add column if not exists gender text
  check (gender in ('male', 'female', 'other'));
