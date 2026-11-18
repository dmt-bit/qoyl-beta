-- Add UPC column to catalog_products for future barcode-based image matching
alter table catalog_products
  add column if not exists upc text;

-- Index for fast lookup by UPC
create index if not exists catalog_products_upc_idx on catalog_products (upc);
