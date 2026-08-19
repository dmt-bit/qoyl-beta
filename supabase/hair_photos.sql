-- Hair progress photos (Style Match integration + profile "My Hair
-- Journey" section + lightweight community feed).
--
-- hair_photos already exists in the live schema with exactly the
-- columns this feature needs (id, user_id, photo_url, caption,
-- hair_length, is_public, taken_at, created_at) -- confirmed against
-- the live schema before writing this file, per the recurring lesson
-- from every prior Style Match migration in this project. What's
-- missing, also matching that same recurring pattern: RLS is enabled
-- but no policies exist yet. Written idempotently (drop-then-create)
-- so this is safe to re-run.

alter table hair_photos enable row level security;

drop policy if exists "Users can insert own hair photos" on hair_photos;
create policy "Users can insert own hair photos"
  on hair_photos for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own hair photos" on hair_photos;
create policy "Users can view own hair photos"
  on hair_photos for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anyone can view public hair photos" on hair_photos;
create policy "Anyone can view public hair photos"
  on hair_photos for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Users can update own hair photos" on hair_photos;
create policy "Users can update own hair photos"
  on hair_photos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own hair photos" on hair_photos;
create policy "Users can delete own hair photos"
  on hair_photos for delete
  to authenticated
  using (auth.uid() = user_id);

-- NOTE on Storage: the "hair-photos" bucket itself is created via the
-- Supabase Storage Management API (not SQL -- same mechanism used for
-- the style-match-images bucket earlier), and is PRIVATE as specified.
-- No storage.objects RLS policy is added for it -- every read/write
-- goes through server-side API routes using the service-role key
-- (app/api/hair-photos/*), which bypasses storage RLS entirely and
-- returns short-lived signed URLs to the client. This mirrors the
-- stylist_accounts lesson from earlier in this project: a table/bucket
-- holding user photos is exactly the kind of thing where "add a broad
-- RLS policy" is the riskier option (one wrong `using` clause and any
-- authenticated user could read anyone's private photos) versus a
-- narrow, easy-to-audit server route that decides access in plain
-- TypeScript instead of a policy expression.
