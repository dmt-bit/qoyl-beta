-- Brand directory + brand catalog page (/search's Brands tab).
--
-- The request's SQL referred to a "brands" table - this project's real
-- brand table is catalog_brands (see the comment above QOYL_PRODUCT_SELECT
-- in app/search/page.tsx: this Supabase project is shared with
-- qoyl-business, which has its own unrelated brands/products tables for
-- its B2B dashboard, so qoyl-beta's consumer catalog lives on separate
-- catalog_* tables to avoid colliding with them). catalog_brands already
-- has id/name/slug/website/instagram/is_indie/is_black_owned/shopper_url -
-- slug is already populated for all 77 existing rows, so there's no
-- backfill needed, and "website_url" isn't added since "website" already
-- covers that. Only logo_url/description are genuinely new.
alter table catalog_brands
  add column if not exists logo_url text,
  add column if not exists description text;

-- Slug is already populated - just making the uniqueness constraint
-- explicit/idempotent rather than assumed.
create unique index if not exists catalog_brands_slug_idx on catalog_brands (slug);

-- Anonymous (no hair profile at all) sort signal for the brand directory
-- and brand catalog page. NOTE: in practice this rarely if ever fires -
-- /search's SearchAuthGate already requires a profile (signed-in or
-- local) before any of app/search/page.tsx renders, so almost every
-- visitor who reaches the brand views gets scored against their own real
-- profile instead. Added anyway per the request/for forward-compat (e.g.
-- if brand browsing is ever opened up before the profile gate).
alter table catalog_products add column if not exists average_score integer;

update catalog_products cp
set average_score = (
  select round(avg(cs.score) * 10)
  from compatibility_scores cs
  join catalog_product_ingredients cpi on cpi.ingredient_id = cs.ingredient_id
  where cpi.product_id = cp.id
);
