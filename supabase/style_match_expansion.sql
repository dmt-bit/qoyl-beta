-- Style Match expansion (paywall, Deep Match, saved styles, inspo mode).
--
-- Per the request, hair_profiles.style_match_count, style_matches'
-- match_mode/color_match/length_difference/involves_extensions/
-- translated_for_hair_type columns, saved_styles, and styles (already
-- seeded with 12 rows) all already exist -- confirmed against the live
-- schema before writing this file. The one gap: saved_styles has RLS
-- enabled but no policies yet (same situation style_matches was in last
-- time -- table created, policies never added). Fixed below, written
-- idempotently (drop-if-exists) per that same lesson.

alter table saved_styles enable row level security;

drop policy if exists "Users can view own saved styles" on saved_styles;
create policy "Users can view own saved styles"
  on saved_styles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved styles" on saved_styles;
create policy "Users can insert own saved styles"
  on saved_styles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved styles" on saved_styles;
create policy "Users can delete own saved styles"
  on saved_styles for delete
  to authenticated
  using (auth.uid() = user_id);

-- No update policy -- saved_styles rows are either present or deleted
-- (unsaved), never edited in place, matching style_matches' pattern.
