-- Style Match Summary feature (public shareable brief for a stylist).
--
-- notes: client-added notes shown on the public summary page.
-- summary_generated_at: set the first time the public summary URL is
-- actually loaded - gates the one-time hey@qoyl.live notification
-- (item 7) so repeat views (e.g. the stylist re-opening the link)
-- don't re-notify every time.
alter table style_matches
  add column if not exists notes text,
  add column if not exists summary_generated_at timestamptz;

-- No RLS/policy changes - the public summary page and its notes-update
-- action both go through service-role API routes (see
-- app/api/style-match/summary/[id]/route.ts), same pattern already used
-- for style_matches writes in app/api/style-match/complete/route.ts,
-- not direct anon-client reads against this owner-scoped table.
