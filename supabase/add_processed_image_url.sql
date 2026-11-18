-- Stores the background-removed version of a product's packshot.
-- Populated by the /admin/visuals "product photos" tab via fal.ai birefnet.
alter table catalog_products
  add column if not exists processed_image_url text;
