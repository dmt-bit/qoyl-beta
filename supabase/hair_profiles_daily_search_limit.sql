-- Adds daily product-search-limit tracking for authenticated users (5
-- free searches/24h, enforced client-side; see lib/searchLimit.ts).
-- daily_search_reset_at is the timestamp the current 24h window started
-- -- the limit resets 24h after a user's FIRST search of the window, not
-- at midnight, matching how anonymous users are tracked in localStorage.

alter table hair_profiles
  add column if not exists daily_search_count integer default 0,
  add column if not exists daily_search_reset_at timestamptz;
