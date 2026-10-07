-- Straight hair scoring fixes - diagnostic audit follow-up (2026-10-07)
--
-- Part 1 is plain DML (INSERT/UPDATE) - already run directly via the
-- service-role client, no dashboard action needed. Pasted here only as a
-- record of what ran, per usual practice.
--
-- Part 2 is the one real schema change (ADD COLUMN) - paste this part into
-- the Supabase SQL editor. The UPDATE in Part 2 runs after you confirm the
-- column exists.

-- ============================================================
-- PART 1 - new categories + product reassignment (DML, already run)
-- ============================================================

-- Real categories.columns are (id, name, slug, hair_types, created_at) -
-- there is no "description" column, so the richer prose from the spec
-- is dropped in favor of the hair_types array this table already uses
-- for the same purpose (see heat-protectant/dry-shampoo's existing rows).
insert into categories (name, slug, hair_types)
values
  ('Volumizing', 'volumizing', array['straight', 'wavy']),
  ('Shine & Finishing', 'shine-finishing', array['straight', 'wavy'])
on conflict (slug) do nothing;

-- "spray"/"serum" categories don't exist in this catalog (real slugs:
-- butter, co-wash, conditioner, curl-cream, deep-conditioner, detangler,
-- dry-shampoo, gel, hair-mask, hairspray, heat-protectant, leave-in,
-- mousse, oil, other, pre-shampoo, scalp-treatment, shampoo, styler,
-- treatment) - dropped from the source category filters below.
update catalog_products
set category_id = (select id from categories where slug = 'volumizing')
where (
  name ilike '%volumiz%' or
  name ilike '%volume%' or
  name ilike '%root lift%' or
  name ilike '%blow dry%' or
  name ilike '%blowdry%' or
  name ilike '%thickening%' or
  name ilike '%body%boost%'
)
and category_id in (
  select id from categories where slug in ('styler', 'mousse', 'treatment')
);

update catalog_products
set category_id = (select id from categories where slug = 'shine-finishing')
where (
  name ilike '%shine%' or
  name ilike '%gloss%' or
  name ilike '%finishing%' or
  name ilike '%anti-frizz%' or
  name ilike '%frizz control%' or
  (name ilike '%serum%' and (name ilike '%shine%' or name ilike '%smooth%' or name ilike '%finish%'))
)
and category_id in (
  select id from categories where slug in ('oil', 'styler', 'treatment')
);

-- ============================================================
-- PART 2 - zero-ingredient product (Fix 6) - PASTE THE ALTER, THEN CONFIRM
-- ============================================================

alter table catalog_products
  add column if not exists is_active boolean not null default true;

-- "Detangler Compare to Paul Mitchell The Detangler" (Generic Value
-- Products / Sally Beauty) has 0 linked ingredients - a store-brand dupe
-- with no unique ingredient data available, not worth flagging for admin
-- entry. Scoped by id (looked up live) rather than an ILIKE pattern, to
-- avoid any chance of matching an unintended row.
update catalog_products
set is_active = false
where id = '448e0068-7dff-4c15-8d84-9a223e243587';
