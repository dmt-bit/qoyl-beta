-- Adds "did you do this style?" follow-through tracking to style_matches.
-- No RLS/policy changes needed: style_matches already has RLS enabled
-- with select/insert-only policies (no update policy - see
-- create_style_match.sql's comment "rows are set once at creation"), and
-- the new follow-up route updates these columns via the service-role
-- client, same as app/api/style-match/complete/route.ts already does.

alter table style_matches
  add column if not exists followed_through boolean not null default false;

alter table style_matches
  add column if not exists followed_through_at timestamptz;

alter table style_matches
  add column if not exists follow_up_photo_url text;
