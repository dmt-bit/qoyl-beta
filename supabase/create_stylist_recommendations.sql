-- "Recommend a stylist" - the Style Match "book a stylist" empty state
-- (app/style-match/page.tsx, app/style-match/summary/[id]/page.tsx) and
-- the standalone app/recommend-a-stylist/page.tsx all write here via
-- app/api/stylist-recommendations/route.ts.
create table if not exists stylist_recommendations (
  id uuid primary key default gen_random_uuid(),
  -- who recommended them - nullable: the summary page is a public,
  -- no-account-required shareable link, so a submission from there has
  -- no session to attach.
  recommended_by uuid references auth.users(id),
  -- stylist info (all optional except the name - a recommender may not
  -- know everything about the stylist they're recommending)
  stylist_name text not null,
  stylist_instagram text,
  stylist_city text,
  stylist_website text,
  stylist_booking_url text,
  -- context
  why_recommend text,
  style_specialty text,
  recommender_curl_type text,
  recommender_city text,
  status text default 'pending'
    check (status in (
      'pending',   -- not yet contacted
      'contacted', -- outreach sent
      'applied',   -- stylist applied
      'live'       -- stylist is on platform
    )),
  -- "[dismiss] - removes from view (soft delete, keeps in DB)" - the
  -- admin table filters this out rather than deleting the row.
  dismissed_at timestamptz,
  created_at timestamptz default now()
);

alter table stylist_recommendations enable row level security;

-- Insert-only from the public forms (anon and signed-in alike) - same
-- shape as ml_events/newsletter_subscribers' policies. No select/
-- update/delete policy for anon/authenticated - read and status updates
-- happen via the service-role client only (app/admin/stylists).
create policy "Allow anon insert"
  on stylist_recommendations for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on stylist_recommendations for insert
  to authenticated
  with check (true);

create index if not exists stylist_recommendations_created_at_idx
  on stylist_recommendations (created_at desc);
create index if not exists stylist_recommendations_status_idx
  on stylist_recommendations (status);
