-- Four notes on what changed from the spec, and why:
--
-- 1. UPDATE (after first running this file): stylist_accounts already
--    existed in this shared Supabase project -- it's qoyl-business's real
--    stylist directory (display_name/contact_name/email/phone/services
--    jsonb/tier/stripe_customer_id/etc, status defaulting to 'pending'),
--    not the table this file originally invented below. The "create
--    table if not exists" silently no-op'd against it, and "create
--    policy" below actually did get created on their live table --
--    harmless in practice only because their table never grants
--    anon/authenticated SELECT at the Postgres GRANT level, so the
--    policy never became readable -- but it's dead weight that could
--    start exposing email/phone/stripe_customer_id on 'active' rows if
--    that grant is ever added later for an unrelated reason. Run the
--    cleanup statement at the bottom of this file to remove it.
--
--    Style Match's stylist matching (Tab 3) now goes through
--    app/api/style-match/stylists/route.ts instead, which reads
--    stylist_accounts with the service-role key server-side and returns
--    only a hand-picked safe subset of columns (id, display_name,
--    salon_name, photo_url, booking_url, hair_types_served) -- no RLS
--    or GRANT changes to the shared table needed or made.
--
-- 2. "stylist_id uuid references stylist_accounts(id) nullable" -- not
--    valid Postgres syntax as written ("nullable" isn't a column
--    modifier keyword). Columns are nullable by default, so this is
--    just `references stylist_accounts(id)` with no NOT NULL. Still
--    correct against the real stylist_accounts.id (uuid PK).
--
-- 3. posts.content_type's existing check constraint (from
--    supabase/add_posts_content_type.sql) only allows
--    ('article', 'original-video', 'repost') -- 'tutorial' isn't a
--    valid value yet, but Tab 1's internal-tutorials query needs it.
--    Adding it as a fourth allowed value below. This assumes the
--    constraint's default auto-generated name
--    (posts_content_type_check) -- if that's wrong for any reason the
--    DROP is a no-op and the ADD will just fail loudly with "constraint
--    already exists" rather than silently corrupting anything; let me
--    know if that happens and I'll adjust.
--
-- 4. UPDATE (after first running this file): the style_matches table got
--    created, but its two "create policy" statements never actually took
--    effect -- confirmed by testing an authenticated insert with a
--    correct user_id, which Postgres rejected with "new row violates
--    row-level security policy". Root cause unconfirmed (most likely the
--    SQL editor stopped partway through the original run), but rather
--    than chase it, every "create policy" statement below is now
--    drop-if-exists-then-create, so this whole file is safe to re-run
--    end to end regardless of what happened last time.
--
-- Also worth flagging: nothing in the actual feature (analyze route,
-- shopping list generation, tutorials, stylist matching) reads from
-- styles or style_items after this migration -- style detection comes
-- from the Anthropic API response, not a lookup table, and the shopping
-- list is generated dynamically. They're created exactly as specified
-- but will sit empty unless something is built later to populate/use
-- them as a reference library.

create table if not exists styles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  hair_types_compatible text[],
  requires_fake_hair boolean default false,
  fake_hair_type text,
  estimated_time text,
  difficulty text check (difficulty in ('beginner','intermediate','advanced')),
  created_at timestamptz default now()
);

alter table styles enable row level security;

drop policy if exists "Anyone can read styles" on styles;
create policy "Anyone can read styles"
  on styles for select
  to anon, authenticated
  using (true);

create table if not exists style_items (
  id uuid primary key default gen_random_uuid(),
  style_id uuid references styles(id),
  item_name text not null,
  category text check (category in ('hair_care','fake_hair','tool','accessory')),
  affiliate_url text,
  retailer text,
  is_optional boolean default false,
  created_at timestamptz default now()
);

alter table style_items enable row level security;

drop policy if exists "Anyone can read style_items" on style_items;
create policy "Anyone can read style_items"
  on style_items for select
  to anon, authenticated
  using (true);

-- stylist_accounts is NOT created here -- see note 1 above, it already
-- exists as qoyl-business's table. style_matches.stylist_id below
-- references it as-is.

create table if not exists style_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  input_type text check (input_type in ('photo','text')),
  input_text text,
  image_url text,
  detected_style text,
  detected_details jsonb,
  tutorials jsonb,
  shopping_list jsonb,
  stylist_id uuid references stylist_accounts(id),
  created_at timestamptz default now()
);

alter table style_matches enable row level security;

drop policy if exists "Users can view own style matches" on style_matches;
create policy "Users can view own style matches"
  on style_matches for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own style matches" on style_matches;
create policy "Users can insert own style matches"
  on style_matches for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update policy -- style_matches rows are set once at creation
-- (matches the pattern used by product_searches/travel_kits: writes
-- either happen client-side at insert time, or server-side via the
-- service role, which bypasses RLS regardless of what policies exist).

alter table posts drop constraint if exists posts_content_type_check;
alter table posts add constraint posts_content_type_check
  check (content_type in ('article', 'original-video', 'repost', 'tutorial'));

-- CLEANUP -- run this too. Removes the RLS policy this file mistakenly
-- created on qoyl-business's shared stylist_accounts table the first
-- time this ran (see note 1 at the top). Confirmed harmless today (no
-- anon/authenticated GRANT exists on that table so nothing was actually
-- readable through it) but it shouldn't be left sitting there.
drop policy if exists "Anyone can read active stylists" on stylist_accounts;
