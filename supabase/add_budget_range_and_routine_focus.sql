-- Adds budget_range and routine_focus to hair_profiles.
--
-- budget_range replaces the existing `budget` column in place rather
-- than adding a second, confusingly-similar question to the profile
-- form. `budget` already existed (see hair_profiles_additional_fields.sql)
-- but was never read by any scoring/filtering logic - it was only ever
-- displayed on the read-only profile summary. Its old bucket boundaries
-- (under_30/30_60/60_100/100_plus) don't map cleanly onto the new ones
-- (under_25/25_50/50_100/over_100), so the handful of existing rows with
-- a value set (10 of 30 profiles as of this writing, values 'under_30'
-- and '30_60' only) are nulled out rather than guess-mapped into a
-- bucket the user never actually chose - they'll just see the new
-- question unanswered next time they visit their profile.
--
-- Wrapped in DO blocks (rather than the plain `add column if not
-- exists` most other migrations in this folder use) because this one
-- renames an existing column and adds a named CHECK constraint, neither
-- of which Postgres supports an "IF NOT EXISTS" form for - safe to
-- re-run either way.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'hair_profiles' and column_name = 'budget'
  ) then
    alter table hair_profiles rename column budget to budget_range;
  end if;
end $$;

update hair_profiles
  set budget_range = null
  where budget_range is not null
    and budget_range not in ('under_25', '25_50', '50_100', 'over_100', 'no_preference');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hair_profiles_budget_range_check'
  ) then
    alter table hair_profiles
      add constraint hair_profiles_budget_range_check
      check (budget_range in ('under_25', '25_50', '50_100', 'over_100', 'no_preference'));
  end if;
end $$;

alter table hair_profiles
  add column if not exists routine_focus text
  check (routine_focus in ('natural_hair', 'extensions', 'both'));
