-- ingredients and compatibility_scores only ever granted select to the
-- anon role (see compatibility_scores.sql). Once email/password auth
-- shipped, signed-in users' requests carry an "authenticated" role
-- instead of "anon", so RLS silently returned zero rows for them --
-- scoreIngredientsText saw an empty ingredients table and reported
-- "No compatibility data found" even though the query itself succeeded.

create policy "Allow authenticated select"
  on ingredients for select
  to authenticated
  using (true);

create policy "Allow authenticated select"
  on compatibility_scores for select
  to authenticated
  using (true);
