-- color_treated existed in the original pre-existing hair_profiles schema
-- (see the comment atop hair_profiles.sql) with a NOT NULL constraint from
-- before this table was repurposed for the app. The "additional fields"
-- migration's `add column if not exists color_treated text` was a no-op
-- since the column already existed, so the old NOT NULL constraint was
-- never relaxed -- breaking every save where a user hasn't answered
-- "Is your hair color treated?" yet, exactly like the user_id fix below.
alter table hair_profiles
  alter column color_treated drop not null;
