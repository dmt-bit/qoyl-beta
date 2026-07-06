-- Adds the expanded profile fields: name/email, shower filter, color
-- treatment, extensions/protective styles, budget, and free-form notes.
-- No CHECK constraints, matching the existing curl_type/strand_thickness
-- columns -- these are plain text (or text[]) columns.

alter table hair_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists shower_filter text,
  add column if not exists color_treated text,
  add column if not exists color_type text,
  add column if not exists extensions text,
  add column if not exists extension_type text[],
  add column if not exists extension_care text,
  add column if not exists budget text,
  add column if not exists notes text;
