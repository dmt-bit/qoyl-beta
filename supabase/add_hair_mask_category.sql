-- Adds "hair-mask" as its own product category, separate from deep-conditioner,
-- and migrates masks that were logged as deep conditioners. Applied via the
-- Supabase JS client (no raw-SQL path in this project); recorded here.
--
-- categories has no `description` column (id, name, slug, hair_types,
-- created_at) and every row uses name = slug, so name is 'hair-mask'.
INSERT INTO categories (name, slug)
SELECT 'hair-mask', 'hair-mask'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'hair-mask');

-- Migrated 20 rows. The two Miche Beauty "Deep Conditioning Treatment"
-- products (matched only by 'treatment') and are intentionally left as
-- deep-conditioner. Result: deep-conditioner 30 -> 10, hair-mask 20.
UPDATE catalog_products
SET category_id = (SELECT id FROM categories WHERE slug = 'hair-mask')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'deep-conditioner')
AND (
  name ILIKE '%mask%' OR name ILIKE '%masque%' OR name ILIKE '%hair mask%' OR
  name ILIKE '%deep mask%' OR name ILIKE '%reconstructor%' OR
  name ILIKE '%protein pack%' OR name ILIKE '%bond repair%'
);
