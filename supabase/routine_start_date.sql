-- Fixes the "always shows clarifying wash day" bug: the 30-day wash
-- calendar was being regenerated from scratch on every page load,
-- treating "today" as day 1 of a brand new cycle every time instead of
-- tracking where the user actually is in their ongoing cycle. This
-- column anchors that cycle to a real, persisted date.
--
-- DEFAULT CURRENT_DATE backfills existing rows to today (the day this
-- migration runs) as a harmless fallback for any profile that reaches
-- /routine without having gone through the Stripe webhook below (e.g.
-- an admin-bypass account) - the webhook is the authoritative setter
-- for real subscribers.
alter table hair_profiles
  add column if not exists routine_start_date date default current_date;
