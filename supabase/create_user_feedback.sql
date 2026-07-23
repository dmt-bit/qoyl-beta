create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  q1_response text,
  q2_response text,
  q3_response text,
  created_at timestamptz not null default now()
);

alter table user_feedback enable row level security;

-- Feedback is only ever collected from signed-in users (the survey never
-- shows to anonymous visitors), so only authenticated insert is allowed,
-- and only for their own user_id. No select policy is added -- responses
-- are read via the Supabase dashboard/service role, matching the
-- product_requests pattern.
create policy "Authenticated users can insert own feedback"
  on user_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);
