-- Add image_url to product_searches so the dashboard can show product
-- photos without a secondary join to catalog_products.
-- The column is nullable (older rows and barcode-only searches have no image).

alter table product_searches
  add column if not exists image_url text;
