-- New homepage footer's newsletter signup (see components/NewsletterSignup.tsx,
-- app/api/newsletter/subscribe/route.ts). The request said "Beehiiv embed
-- or form" - no Beehiiv publication ID or API key exists anywhere in this
-- project's env vars, so this builds the plain-form path instead: a real
-- table + API route, not a mailto stub.
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text, -- e.g. "homepage_footer" - which form submitted it
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

-- Insert-only from the public form (anon and signed-in alike) - no
-- select/update/delete policy, matching ml_events/brand_applications'
-- shape (read via the service-role client only).
create policy "Allow anon insert"
  on newsletter_subscribers for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on newsletter_subscribers for insert
  to authenticated
  with check (true);

create index if not exists newsletter_subscribers_email_idx on newsletter_subscribers (email);
