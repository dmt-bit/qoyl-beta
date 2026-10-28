-- Stylist RSVPs for events (starting with "Find Your Stylist") - paste
-- into the Supabase SQL editor. Not run from the app (service-role
-- client can't run DDL).
--
-- Deliberately a new table, not a reuse of vendor_profiles (the
-- request's own fallback suggestion). Checked live: vendor_profiles is
-- actively used by qoyl-business's admin dashboard
-- (components/admin/VendorsTable.tsx), which types plan_type as a
-- closed union ("stylist" | "hair-seller" | "brand") and status as
-- ("pending_review" | "active" | "rejected") to drive its filters,
-- labels, and an "approve" action that activates real vendor
-- applications. Inserting a plan_type like 'stylist_rsvp' would show up
-- there with an undefined label/badge and risk being actioned by the
-- approve flow - wrong semantics for a one-off local event RSVP, so a
-- dedicated table avoids any blast radius on that unrelated app.

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_slug text not null,
  role text not null default 'stylist',
  name text not null,
  email text not null,
  business_name text,
  instagram_handle text
);

alter table public.event_rsvps enable row level security;

-- No insert/select policies - the only write path is
-- app/api/stylist-rsvp/route.ts, which uses the service-role client
-- (bypasses RLS) after validating its own inputs server-side. No
-- client-side read of this table exists.
