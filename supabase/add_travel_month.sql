-- Adds month-only travel dates as an alternative to exact departure/
-- return dates (Style Match's travel kit survey Step 1). Confirmed
-- against the live schema first: travel_kits currently has no
-- travel_month column, and departure_date/return_date are typed `date`
-- (not text), so they simply can't hold a "October 2026"-style value --
-- this has to be a new, separate, nullable column, not a type change to
-- the existing ones.

alter table travel_kits add column if not exists travel_month text;

-- No RLS/policy changes needed -- RLS is row-level, not column-level,
-- so a new nullable column doesn't change who can read/write existing
-- rows. Writes already all go through server-side routes using the
-- service-role key (app/api/travel-kits/*, the Stripe webhook, the
-- admin-activate bypass); the client does read its own rows directly
-- (app/travel/page.tsx), which is fine -- that's a read of columns that
-- already exist, unaffected by adding one more.
