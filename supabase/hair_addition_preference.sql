-- Human vs synthetic hair preference (see conversation for full spec).
--
-- extension_profiles is intentionally NOT touched here - it already has
-- extension_texture (synthetic / human_straight / human_wavy /
-- human_curly / blended / heat_resistant_synthetic), which is the same
-- preference at finer grain. lib/hairAdditionPreference.ts normalizes
-- that existing field into the same 5-way preference instead of adding
-- a second, overlapping column.
--
-- child_profiles is also intentionally not touched - skipped per your
-- answer, so the child profile form doesn't get this question.

ALTER TABLE hair_profiles
ADD COLUMN IF NOT EXISTS hair_addition_preference text
CHECK (hair_addition_preference IN (
  'human_hair_only',
  'synthetic_only',
  'heat_resistant_synthetic',
  'no_preference',
  'natural_hair_only'
));

-- No 'natural_hair_only' here - the Deep Match survey only asks this
-- once the user has already said the style involves added hair, so
-- "natural hair only" isn't a coherent answer in that context (item 3).
ALTER TABLE style_matches
ADD COLUMN IF NOT EXISTS hair_addition_preference text
CHECK (hair_addition_preference IN (
  'human_hair_only',
  'synthetic_only',
  'heat_resistant_synthetic',
  'no_preference'
));

-- brand_catalog_products - the brand-side entry form that sets this
-- lives in qoyl-business (business.qoyl.live), a separate codebase not
-- touched here. This column is added so this repo's shopping-list
-- queries can filter/prioritize by it once brands start setting it.
ALTER TABLE brand_catalog_products
ADD COLUMN IF NOT EXISTS hair_type_category text
CHECK (hair_type_category IN (
  'human_hair',
  'synthetic',
  'heat_resistant_synthetic',
  'blended',
  'care_product'
));
