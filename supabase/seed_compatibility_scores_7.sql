-- Ingredients requested for the compatibility_scores expansion (batch of 25).
-- 9 of the 25 requested already existed in the live table and were skipped:
-- Orbignya Oleifera (Babassu) Oil, Astrocaryum Murumuru Seed Butter, Mauritia
-- Flexuosa (Buriti) Fruit Oil, Copaifera Officinalis Resin (Copaiba Balsam),
-- Punica Granatum Extract (Pomegranate Extract -- distinct from Punica Granatum
-- SEED OIL, which is new and kept), Benzoic Acid, Sodium Chloride, Glyceryl
-- Stearate, and Macadamia Integrifolia Seed Oil.
--
-- Citrus Medica Limonum Fruit Extract (Lemon) gets extra scalp_condition-
-- specific rows (oily/sensitive) alongside its base porosity rows, matching
-- the existing Fragrance/DMDM Hydantoin pattern already in the table.

insert into ingredients (id, inci_name, common_name) values
  ('06ad1045-3861-4a18-bcf0-8adf1c365073', 'Punica Granatum Seed Oil', 'Pomegranate Seed Oil'),
  ('7c58aef7-a1a0-426c-bfb7-0e9ed36ecd6b', 'Euterpe Oleracea Fruit Extract', 'Acai Extract'),
  ('7f0e3946-01a7-4e5d-a994-e9426b55e365', 'Polyquaternium-7', 'PQ-7'),
  ('7cab4134-24e6-4636-a31c-405dc8538b54', 'Disodium Lauryl Sulfosuccinate', 'Disodium Lauryl Sulfosuccinate'),
  ('8c976c91-86b6-4be0-a79f-2e75886c3c3f', 'Cocamide MEA', 'Cocamide MEA'),
  ('ab36a51a-8fec-47f9-b729-bee6b849c7f7', 'PEG-150 Distearate', 'PEG-150 Distearate'),
  ('6cd8dc91-2c29-4c2f-9fd8-a0b7fc90af36', 'Glycol Stearate', 'Glycol Stearate'),
  ('04b9a4ed-aec0-4347-aabd-be85a7049a29', 'Butylene Glycol', 'Butylene Glycol'),
  ('a171a109-1f2c-4c1b-82ff-58454f18d994', 'Hexylene Glycol', 'Hexylene Glycol'),
  ('4092ad2f-2ff2-499c-b89a-8c360b1d42b8', 'Vaccinium Myrtillus Fruit Extract', 'Bilberry Extract'),
  ('4da9ce28-fd3f-4996-8956-818e884e0bf3', 'Saccharum Officinarum Extract', 'Sugar Cane Extract'),
  ('4ce59bab-9c4d-4ddc-844c-a922d9ffafdf', 'Acer Saccharum Extract', 'Sugar Maple Extract'),
  ('6e6b6c46-f8b1-4bad-9acd-ca607696c902', 'Citrus Aurantium Dulcis Fruit Extract', 'Orange Fruit Extract'),
  ('734e0426-fb17-4e3b-a5b9-441543c3e923', 'Pyrus Malus Fruit Extract', 'Apple Fruit Extract'),
  ('c3c9facd-d1b1-44c0-9805-d573e1040b97', 'Hexapeptide-11', 'Hexapeptide-11'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'Citrus Medica Limonum Fruit Extract', 'Lemon Fruit Extract')
on conflict do nothing;

insert into compatibility_scores (ingredient_id, porosity, scalp_condition, score, rating, reason) values
  -- Pomegranate Seed Oil
  ('06ad1045-3861-4a18-bcf0-8adf1c365073', 'low', null, 8, 'good', 'High in punicic acid; lightweight oil strengthens the cuticle without heaviness.'),
  ('06ad1045-3861-4a18-bcf0-8adf1c365073', 'medium', null, 8, 'good', 'Antioxidant-rich oil conditions well without excess heaviness.'),
  ('06ad1045-3861-4a18-bcf0-8adf1c365073', 'high', null, 8, 'good', 'Strengthens and conditions gappy cuticles without heaviness.'),
  -- Acai Extract
  ('7c58aef7-a1a0-426c-bfb7-0e9ed36ecd6b', 'low', null, 8, 'good', 'Antioxidant extract strengthens the strand without buildup.'),
  ('7c58aef7-a1a0-426c-bfb7-0e9ed36ecd6b', 'medium', null, 8, 'good', 'Strengthens strand with antioxidant support.'),
  ('7c58aef7-a1a0-426c-bfb7-0e9ed36ecd6b', 'high', null, 8, 'good', 'Strengthens strand without adding heaviness.'),
  -- PQ-7
  ('7f0e3946-01a7-4e5d-a994-e9426b55e365', 'low', null, 5, 'neutral', 'Lightweight conditioning film-former; mild but can build up slightly on tight, resistant cuticles.'),
  ('7f0e3946-01a7-4e5d-a994-e9426b55e365', 'medium', null, 8, 'good', 'Conditions and detangles with manageable buildup risk.'),
  ('7f0e3946-01a7-4e5d-a994-e9426b55e365', 'high', null, 8, 'good', 'Conditions and detangles gappy cuticles well.'),
  -- Disodium Lauryl Sulfosuccinate
  ('7cab4134-24e6-4636-a31c-405dc8538b54', 'low', null, 5, 'neutral', 'Mild cleansing agent, much gentler than SLS; low irritation but still a mild surfactant.'),
  ('7cab4134-24e6-4636-a31c-405dc8538b54', 'medium', null, 5, 'neutral', 'Gentle cleansing with low irritation potential.'),
  ('7cab4134-24e6-4636-a31c-405dc8538b54', 'high', null, 5, 'neutral', 'Gentle cleansing with low irritation potential.'),
  -- Cocamide MEA
  ('8c976c91-86b6-4be0-a79f-2e75886c3c3f', 'low', null, 5, 'neutral', 'Foam booster and thickener with no notable direct conditioning effect.'),
  ('8c976c91-86b6-4be0-a79f-2e75886c3c3f', 'medium', null, 5, 'neutral', 'Foam booster and thickener with no notable direct conditioning effect.'),
  ('8c976c91-86b6-4be0-a79f-2e75886c3c3f', 'high', null, 5, 'neutral', 'Foam booster and thickener with no notable direct conditioning effect.'),
  -- PEG-150 Distearate
  ('ab36a51a-8fec-47f9-b729-bee6b849c7f7', 'low', null, 5, 'neutral', 'Thickener/emulsifier with no notable direct effect on hair.'),
  ('ab36a51a-8fec-47f9-b729-bee6b849c7f7', 'medium', null, 5, 'neutral', 'Thickener/emulsifier with no notable direct effect on hair.'),
  ('ab36a51a-8fec-47f9-b729-bee6b849c7f7', 'high', null, 5, 'neutral', 'Thickener/emulsifier with no notable direct effect on hair.'),
  -- Glycol Stearate
  ('6cd8dc91-2c29-4c2f-9fd8-a0b7fc90af36', 'low', null, 5, 'neutral', 'Opacifier that gives a pearlescent appearance; no direct hair benefit or harm.'),
  ('6cd8dc91-2c29-4c2f-9fd8-a0b7fc90af36', 'medium', null, 5, 'neutral', 'Cosmetic opacifier with no notable direct effect on hair.'),
  ('6cd8dc91-2c29-4c2f-9fd8-a0b7fc90af36', 'high', null, 5, 'neutral', 'Cosmetic opacifier with no notable direct effect on hair.'),
  -- Butylene Glycol
  ('04b9a4ed-aec0-4347-aabd-be85a7049a29', 'low', null, 8, 'good', 'Lightweight humectant; better tolerated than glycerin on resistant, tight cuticles.'),
  ('04b9a4ed-aec0-4347-aabd-be85a7049a29', 'medium', null, 8, 'good', 'Lightweight humectant hydrates with low buildup risk.'),
  ('04b9a4ed-aec0-4347-aabd-be85a7049a29', 'high', null, 8, 'good', 'Lightweight humectant hydrates without adding heaviness.'),
  -- Hexylene Glycol
  ('a171a109-1f2c-4c1b-82ff-58454f18d994', 'low', null, 5, 'neutral', 'Solvent and mild humectant, similar to butylene glycol but with less conditioning benefit.'),
  ('a171a109-1f2c-4c1b-82ff-58454f18d994', 'medium', null, 5, 'neutral', 'Solvent and mild humectant with modest hydrating benefit.'),
  ('a171a109-1f2c-4c1b-82ff-58454f18d994', 'high', null, 5, 'neutral', 'Solvent and mild humectant with modest hydrating benefit.'),
  -- Bilberry Extract
  ('4092ad2f-2ff2-499c-b89a-8c360b1d42b8', 'low', null, 8, 'good', 'Mild AHA source gently exfoliates the scalp without buildup.'),
  ('4092ad2f-2ff2-499c-b89a-8c360b1d42b8', 'medium', null, 8, 'good', 'Antioxidant, mild exfoliating benefit for the scalp.'),
  ('4092ad2f-2ff2-499c-b89a-8c360b1d42b8', 'high', null, 8, 'good', 'Antioxidant support without adding heaviness.'),
  -- Sugar Cane Extract
  ('4da9ce28-fd3f-4996-8956-818e884e0bf3', 'low', null, 8, 'good', 'Natural AHA source gently exfoliates the scalp without buildup.'),
  ('4da9ce28-fd3f-4996-8956-818e884e0bf3', 'medium', null, 8, 'good', 'Gentle exfoliating and brightening benefit for the scalp.'),
  ('4da9ce28-fd3f-4996-8956-818e884e0bf3', 'high', null, 8, 'good', 'Gentle exfoliation without adding heaviness.'),
  -- Sugar Maple Extract
  ('4ce59bab-9c4d-4ddc-844c-a922d9ffafdf', 'low', null, 8, 'good', 'Natural AHA source gently exfoliates the scalp without buildup.'),
  ('4ce59bab-9c4d-4ddc-844c-a922d9ffafdf', 'medium', null, 8, 'good', 'Gentle exfoliating benefit for the scalp.'),
  ('4ce59bab-9c4d-4ddc-844c-a922d9ffafdf', 'high', null, 8, 'good', 'Gentle exfoliation without adding heaviness.'),
  -- Orange Fruit Extract
  ('6e6b6c46-f8b1-4bad-9acd-ca607696c902', 'low', null, 8, 'good', 'Vitamin C source provides antioxidant support without buildup.'),
  ('6e6b6c46-f8b1-4bad-9acd-ca607696c902', 'medium', null, 8, 'good', 'Antioxidant, brightening benefit.'),
  ('6e6b6c46-f8b1-4bad-9acd-ca607696c902', 'high', null, 8, 'good', 'Antioxidant support without adding heaviness.'),
  -- Apple Fruit Extract
  ('734e0426-fb17-4e3b-a5b9-441543c3e923', 'low', null, 8, 'good', 'Natural AHA and antioxidant extract adds moisture without buildup.'),
  ('734e0426-fb17-4e3b-a5b9-441543c3e923', 'medium', null, 8, 'good', 'Antioxidant support with light moisture.'),
  ('734e0426-fb17-4e3b-a5b9-441543c3e923', 'high', null, 8, 'good', 'Antioxidant support without adding heaviness.'),
  -- Hexapeptide-11
  ('c3c9facd-d1b1-44c0-9805-d573e1040b97', 'low', null, 8, 'good', 'Strengthens the hair shaft and improves elasticity without buildup.'),
  ('c3c9facd-d1b1-44c0-9805-d573e1040b97', 'medium', null, 8, 'good', 'Strengthens strand and reduces breakage.'),
  ('c3c9facd-d1b1-44c0-9805-d573e1040b97', 'high', null, 8, 'good', 'Strengthens fragile, gappy cuticles without adding heaviness.'),
  -- Lemon Fruit Extract
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'low', null, 5, 'neutral', 'Citrus extract with clarifying, AHA-like properties; most beneficial for oily scalp specifically, and can be irritating for sensitive scalp.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'medium', null, 5, 'neutral', 'Clarifying, AHA-like properties; most beneficial for oily scalp specifically.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'high', null, 5, 'neutral', 'Clarifying, AHA-like properties; most beneficial for oily scalp specifically.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'low', 'oily', 8, 'good', 'Clarifying, AHA-like acidity helps cut through excess oil and scalp buildup.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'medium', 'oily', 8, 'good', 'Clarifying, AHA-like acidity helps cut through excess oil and scalp buildup.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'high', 'oily', 8, 'good', 'Clarifying, AHA-like acidity helps cut through excess oil and scalp buildup.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'low', 'sensitive', 3, 'caution', 'Acidic citrus extract can irritate already-reactive, sensitive scalps.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'medium', 'sensitive', 3, 'caution', 'Acidic citrus extract can irritate already-reactive, sensitive scalps.'),
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'high', 'sensitive', 3, 'caution', 'Acidic citrus extract can irritate already-reactive, sensitive scalps.')
on conflict do nothing;
