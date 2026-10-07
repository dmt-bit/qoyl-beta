-- Login-count-based home screen prompt (replaces the profile-flow step and
-- the session-count banner). Run in the Supabase SQL editor. Safe to re-run.

ALTER TABLE hair_profiles
  ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS home_screen_prompted_at timestamptz,
  ADD COLUMN IF NOT EXISTS launched_standalone_count integer NOT NULL DEFAULT 0;
