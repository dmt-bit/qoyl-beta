-- Mainstream/drugstore brands, added alongside the original indie/
-- Black-owned-focused seed in seed_catalog_brands.sql. Africa's Best is
-- included here for documentation completeness even though it was
-- already seeded earlier -- on conflict (name) do nothing skips it.
insert into catalog_brands (name, slug) values
  ('Olaplex', 'olaplex'),
  ('Garnier', 'garnier'),
  ('ORS', 'ors'),
  ('Hask', 'hask'),
  ('Africa''s Best', 'africas-best'),
  ('Dove', 'dove'),
  ('Pantene', 'pantene'),
  ('TRESemmé', 'tresemme'),
  ('Aveeno', 'aveeno'),
  ('Odele', 'odele'),
  ('Monday Haircare', 'monday-haircare'),
  ('Being Frenshe', 'being-frenshe'),
  ('Nexxus', 'nexxus'),
  ('Kristin Ess', 'kristin-ess'),
  ('Palmer''s', 'palmers')
on conflict (name) do nothing;
