-- Brand logos are shown from a website domain (components/BrandLogo.tsx).
-- The domain lives on catalog_brands - the table product cards and the brand
-- directory join to. (The older `brands` table has no rows linked to products.)
-- Run in the Supabase SQL editor. Safe to re-run.

ALTER TABLE catalog_brands
  ADD COLUMN IF NOT EXISTS website_domain text;  -- just the domain, e.g. 'briogeo.com'

-- Only domains where the favicon service returns a real icon. Brands not
-- listed here stay NULL until their domain is checked (see the count below).
UPDATE catalog_brands SET website_domain = 'briogeo.com'          WHERE website_domain IS NULL AND name ILIKE '%briogeo%';
UPDATE catalog_brands SET website_domain = 'mielleorganics.com'   WHERE website_domain IS NULL AND name ILIKE '%mielle%';
UPDATE catalog_brands SET website_domain = 'designessentials.com' WHERE website_domain IS NULL AND name ILIKE '%design essentials%';
UPDATE catalog_brands SET website_domain = 'ceremonia.com'        WHERE website_domain IS NULL AND name ILIKE '%ceremonia%';
UPDATE catalog_brands SET website_domain = 'ogxbeauty.com'        WHERE website_domain IS NULL AND (name ILIKE '%ogx%' OR name ILIKE '%organix%');
UPDATE catalog_brands SET website_domain = 'dove.com'             WHERE website_domain IS NULL AND name ILIKE 'dove';
UPDATE catalog_brands SET website_domain = 'mizani.com'           WHERE website_domain IS NULL AND name ILIKE '%mizani%';
UPDATE catalog_brands SET website_domain = 'pantene.com'          WHERE website_domain IS NULL AND name ILIKE '%pantene%';
UPDATE catalog_brands SET website_domain = 'tresemme.com'         WHERE website_domain IS NULL AND name ILIKE '%tresemm%';
UPDATE catalog_brands SET website_domain = 'herbalessences.com'   WHERE website_domain IS NULL AND name ILIKE '%herbal essence%';
UPDATE catalog_brands SET website_domain = 'michebeauty.com'      WHERE website_domain IS NULL AND name ILIKE '%miche%';
UPDATE catalog_brands SET website_domain = 'ecoslay.com'          WHERE website_domain IS NULL AND name ILIKE '%ecoslay%';
UPDATE catalog_brands SET website_domain = 'olaplex.com'          WHERE website_domain IS NULL AND name ILIKE '%olaplex%';
UPDATE catalog_brands SET website_domain = 'patternbeauty.com'    WHERE website_domain IS NULL AND name ILIKE 'pattern%';
UPDATE catalog_brands SET website_domain = 'alikaynaturals.com'   WHERE website_domain IS NULL AND name ILIKE '%alikay%';
UPDATE catalog_brands SET website_domain = 'kinky-curly.com'      WHERE website_domain IS NULL AND name ILIKE '%kinky%curly%';
UPDATE catalog_brands SET website_domain = 'auntjackiescurlsandcoils.com' WHERE website_domain IS NULL AND name ILIKE '%aunt jackie%';

-- Fill from an existing website value, if one is set (none are today).
UPDATE catalog_brands
  SET website_domain = regexp_replace(regexp_replace(lower(website), '^https?://(www\.)?', ''), '/.*$', '')
  WHERE website_domain IS NULL AND website IS NOT NULL AND website <> '';

-- Coverage after running:
SELECT
  COUNT(*) AS total_brands,
  COUNT(website_domain) AS has_domain,
  COUNT(*) - COUNT(website_domain) AS missing_domain
FROM catalog_brands;
