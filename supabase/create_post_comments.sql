create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null references posts(slug),
  user_id uuid references auth.users(id),
  display_name text not null,
  email text,
  body text not null,
  created_at timestamptz default now(),
  approved boolean default true
);

alter table post_comments enable row level security;

-- Anyone (signed in or not) can read approved comments -- the comment
-- section on /posts/[slug] is public, no login required to view.
create policy "Anyone can read approved comments"
  on post_comments for select
  to anon, authenticated
  using (approved = true);

-- No login required to comment -- both anonymous and authenticated
-- visitors can insert. New comments default to approved = true per the
-- table default, so they appear immediately.
create policy "Allow anon insert"
  on post_comments for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on post_comments for insert
  to authenticated
  with check (true);

-- No explicit "service role can update" policy is added: the service
-- role (getSupabaseAdmin(), used by admin/moderation tooling) bypasses
-- RLS entirely, so a policy granting it update access would be a no-op.
-- This mirrors how product_searches and compatibility_scores handle
-- service-role access elsewhere in this project.
