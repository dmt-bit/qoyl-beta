-- Multi-function product support: a catalog product can cover additional
-- categories beyond its primary category_id. When one of these products
-- wins its primary category slot, the secondary categories are skipped
-- entirely rather than finding separate single-function alternatives.
--
-- Usage: array of UUIDs from the categories table. null = single-category
-- product (the existing default).

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS secondary_category_ids uuid[] DEFAULT NULL;

-- Seed known consolidators. UUIDs are looked up at runtime from the
-- categories table by slug; this uses a subquery so the seed works
-- regardless of which UUID was assigned in a given environment.
--
-- Color Wow Dream Coat Supernatural Spray
-- Primary: heat-protectant
-- Also covers: styler (smooth/frizz), shine-finishing, volumizing
UPDATE catalog_products
SET secondary_category_ids = ARRAY(
  SELECT id FROM categories WHERE slug IN ('styler', 'shine-finishing', 'volumizing')
)
WHERE name ILIKE '%dream coat%'
  AND category_id = (SELECT id FROM categories WHERE slug = 'heat-protectant');

-- Olaplex No.3 Hair Perfector
-- Primary: treatment
-- Also covers: deep-conditioner, hair-mask
UPDATE catalog_products
SET secondary_category_ids = ARRAY(
  SELECT id FROM categories WHERE slug IN ('deep-conditioner', 'hair-mask')
)
WHERE name ILIKE '%olaplex%no.3%' OR name ILIKE '%olaplex%no. 3%'
  AND category_id = (SELECT id FROM categories WHERE slug = 'treatment');

-- Mielle Organics Rosemary Mint Scalp & Hair Strengthening Oil
-- Primary: scalp-treatment
-- Also covers: oil, treatment
UPDATE catalog_products
SET secondary_category_ids = ARRAY(
  SELECT id FROM categories WHERE slug IN ('oil', 'treatment')
)
WHERE name ILIKE '%mielle%rosemary%'
  AND category_id = (SELECT id FROM categories WHERE slug = 'scalp-treatment');

-- Cantu Shea Butter Leave-In Conditioning Repair Cream
-- Primary: leave-in
-- Also covers: curl-cream, detangler
UPDATE catalog_products
SET secondary_category_ids = ARRAY(
  SELECT id FROM categories WHERE slug IN ('curl-cream', 'detangler')
)
WHERE name ILIKE '%cantu%leave-in%repair%'
  AND category_id = (SELECT id FROM categories WHERE slug = 'leave-in');

-- SheaMoisture Jamaican Black Castor Oil Strengthen & Restore Conditioner
-- Primary: conditioner
-- Also covers: treatment, hair-mask
UPDATE catalog_products
SET secondary_category_ids = ARRAY(
  SELECT id FROM categories WHERE slug IN ('treatment', 'hair-mask')
)
WHERE name ILIKE '%jamaican black castor%strengthen%'
  AND category_id = (SELECT id FROM categories WHERE slug = 'conditioner');
