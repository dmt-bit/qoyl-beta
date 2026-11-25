-- Add tool and accessory as catalog_products categories so admins can
-- add styling tools and hair accessories to the qoyl store (admin/products).
-- These categories appear in the style match shopping list alongside
-- hair care products, with store buy buttons when a catalog entry exists.

insert into categories (name, slug) values
  ('tool', 'tool'),
  ('accessory', 'accessory')
on conflict (name) do nothing;
