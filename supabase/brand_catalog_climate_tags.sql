-- Item 7 of the indie brand product catalog spec: the Travel Kit
-- generator (lib/travelKitGenerator.ts) should prioritize brand
-- products tagged for climate-relevant conditions matching the trip's
-- destination (e.g. humid-climate-tagged products for a humid
-- destination). brand_catalog_products has no climate column at all
-- today, so this adds one.
--
-- Additive and non-breaking: existing rows (there are currently none)
-- default to an empty array, which the app treats as "untagged" - such
-- a product still shows, it's just not climate-boosted. Idempotent via
-- IF NOT EXISTS so it's safe to run more than once.
ALTER TABLE brand_catalog_products
  ADD COLUMN IF NOT EXISTS climate_tags text[] NOT NULL DEFAULT '{}';
