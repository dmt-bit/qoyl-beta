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
--
-- A second batch of 34 was requested afterward and appended below (rows 30+
-- in the ingredients insert). 13 of those 34 already existed and were
-- skipped: Trichilia Emetica (Mafura) Seed Butter, Adansonia Digitata
-- (Baobab) Seed Oil, Ficus Carica Fruit Extract (requested as "Fruit/Leaf
-- Extract" -- treated as the same practical ingredient), Sodium Benzoate,
-- Potassium Sorbate, Caprylhydroxamic Acid, Behentrimonium Chloride,
-- Stearyl Alcohol, Diheptyl Succinate, Caprylyl Glycerin/Sebacic Acid
-- Copolymer (requested as "Capryloyl" -- treated as the same ingredient),
-- Hydroxyethylcellulose, Glycine Soja (Soybean) Oil, and Lactic Acid.

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
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'Citrus Medica Limonum Fruit Extract', 'Lemon Fruit Extract'),
  ('81ab2c7f-067e-4790-84c4-575e8cf1f68c', 'Sodium Lauroyl Isethionate', 'SLI'),
  ('852d5e14-f7f0-4d6e-af79-83437d9de577', 'Sodium Lauroyl Lactylate', 'Sodium Lauroyl Lactylate'),
  ('143ddb3b-da21-4fd0-848d-56e052c6913c', 'Sodium Methyl Cocoyl Taurate', 'Sodium Methyl Cocoyl Taurate'),
  ('32c58e70-72b7-424e-9c1b-c0cc5ab50d69', 'Sodium Phytate', 'Sodium Phytate'),
  ('e47c6f8a-023d-492c-a526-254c5a243116', 'Stearamidopropyl Dimethylamine', 'Stearamidopropyl Dimethylamine'),
  ('b7538781-e0b9-44dc-84d8-7bb2f6f5dd61', 'Hydrogenated Vegetable Oil', 'Hydrogenated Vegetable Oil'),
  ('38114c09-c574-4b65-85b0-84559cf55a37', 'Dipropylene Glycol', 'Dipropylene Glycol'),
  ('72347ed9-00f7-49bf-bac6-d8a954269a7c', 'Saccharide Isomerate', 'Saccharide Isomerate'),
  ('1269f0eb-8ace-4406-8e51-b4f09f0e3cb6', 'Hydroxypropylgluconamide', 'Hydroxypropylgluconamide'),
  ('35e41eaa-4d60-4bd9-b806-daf13a21422d', 'Hydroxypropylammonium Gluconate', 'Hydroxypropylammonium Gluconate'),
  ('4b1632d2-f55a-4c94-9536-4b218776fe0c', 'Triethyl Citrate', 'Triethyl Citrate'),
  ('ace8a0ac-1899-4ba4-851f-365dddc803c7', 'Jojoba Esters', 'Jojoba Esters'),
  ('0a8bda21-aa31-4479-9eed-e5fc484313ed', 'Hydrolyzed Jojoba Esters', 'Hydrolyzed Jojoba Esters'),
  ('aabdfeed-2a7e-477e-aeec-5d466f017d53', 'Dicaprylyl Ether', 'Dicaprylyl Ether'),
  ('21a09889-79b5-4538-80be-314daa1cacb0', 'Polysorbate 60', 'Polysorbate 60'),
  ('c4ddb936-e62c-4c28-964b-95b152800dc4', 'Disodium Phosphate', 'Disodium Phosphate'),
  ('88897f3a-efb3-4eb1-a42c-85deabadddf6', 'Hydroxypropyltrimonium Honey', 'Hydroxypropyltrimonium Honey'),
  ('6963cf95-a3d3-47eb-9279-c8fd1682c58f', 'Ammonium Lauryl Sulfate', 'ALS'),
  ('08ed7233-5746-4812-bc5b-b6bfcfdbd356', 'Ammonium Laureth Sulfate', 'Ammonium Laureth Sulfate'),
  ('018a04ec-1902-49e8-844c-e564bc63c540', 'Lauryl Glucoside', 'Lauryl Glucoside'),
  ('cdf8f5a6-fdd3-46f4-a3dc-2547d1c20100', 'Lauramide DEA', 'Lauramide DEA')
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
  ('76124b73-22a2-4a47-8490-9c9f899fe3d9', 'high', 'sensitive', 3, 'caution', 'Acidic citrus extract can irritate already-reactive, sensitive scalps.'),
  -- SLI
  ('81ab2c7f-067e-4790-84c4-575e8cf1f68c', 'low', null, 8, 'good', 'Very mild, coconut-derived cleanser that doesn''t strip moisture.'),
  ('81ab2c7f-067e-4790-84c4-575e8cf1f68c', 'medium', null, 8, 'good', 'Excellent, non-stripping cleansing across most hair types.'),
  ('81ab2c7f-067e-4790-84c4-575e8cf1f68c', 'high', null, 8, 'good', 'Cleans gently without exacerbating dryness in gappy cuticles.'),
  -- Sodium Lauroyl Lactylate
  ('852d5e14-f7f0-4d6e-af79-83437d9de577', 'low', null, 8, 'good', 'Mild emulsifier/cleanser with conditioning benefit; gentle on tight cuticles.'),
  ('852d5e14-f7f0-4d6e-af79-83437d9de577', 'medium', null, 8, 'good', 'Gentle, conditioning cleansing across most hair types.'),
  ('852d5e14-f7f0-4d6e-af79-83437d9de577', 'high', null, 8, 'good', 'Conditions while cleansing without exacerbating dryness.'),
  -- Sodium Methyl Cocoyl Taurate
  ('143ddb3b-da21-4fd0-848d-56e052c6913c', 'low', null, 8, 'good', 'Ultra-mild, sulfate-free cleanser that doesn''t strip moisture.'),
  ('143ddb3b-da21-4fd0-848d-56e052c6913c', 'medium', null, 8, 'good', 'Gentle, non-stripping cleansing across most hair types.'),
  ('143ddb3b-da21-4fd0-848d-56e052c6913c', 'high', null, 8, 'good', 'Cleans gently without exacerbating dryness in gappy cuticles.'),
  -- Sodium Phytate
  ('32c58e70-72b7-424e-9c1b-c0cc5ab50d69', 'low', null, 5, 'neutral', 'Natural chelating agent binds hard water minerals; no direct conditioning effect.'),
  ('32c58e70-72b7-424e-9c1b-c0cc5ab50d69', 'medium', null, 5, 'neutral', 'Chelating agent that improves product performance in hard water.'),
  ('32c58e70-72b7-424e-9c1b-c0cc5ab50d69', 'high', null, 5, 'neutral', 'Chelating agent with minimal direct conditioning effect.'),
  -- Stearamidopropyl Dimethylamine
  ('e47c6f8a-023d-492c-a526-254c5a243116', 'low', null, 8, 'good', 'Conditioning agent adds slip and softness without heavy buildup.'),
  ('e47c6f8a-023d-492c-a526-254c5a243116', 'medium', null, 8, 'good', 'Adds slip and softness while reducing static.'),
  ('e47c6f8a-023d-492c-a526-254c5a243116', 'high', null, 8, 'good', 'Adds slip and softness to gappy, high porosity cuticles.'),
  -- Hydrogenated Vegetable Oil
  ('b7538781-e0b9-44dc-84d8-7bb2f6f5dd61', 'low', null, 4, 'caution', 'Heavy, occlusive emollient can sit on tight cuticles and cause buildup.'),
  ('b7538781-e0b9-44dc-84d8-7bb2f6f5dd61', 'medium', null, 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('b7538781-e0b9-44dc-84d8-7bb2f6f5dd61', 'high', null, 6, 'neutral', 'Occlusive emollient helps seal moisture, though not as targeted as lighter oils.'),
  -- Dipropylene Glycol
  ('38114c09-c574-4b65-85b0-84559cf55a37', 'low', null, 5, 'neutral', 'Solvent and mild humectant with modest hydrating benefit.'),
  ('38114c09-c574-4b65-85b0-84559cf55a37', 'medium', null, 5, 'neutral', 'Solvent and mild humectant with modest hydrating benefit.'),
  ('38114c09-c574-4b65-85b0-84559cf55a37', 'high', null, 5, 'neutral', 'Solvent and mild humectant with modest hydrating benefit.'),
  -- Saccharide Isomerate
  ('72347ed9-00f7-49bf-bac6-d8a954269a7c', 'low', null, 8, 'good', 'Skin-identical moisturizer binds water long-term without heaviness.'),
  ('72347ed9-00f7-49bf-bac6-d8a954269a7c', 'medium', null, 8, 'good', 'Long-term moisture binding with low buildup risk.'),
  ('72347ed9-00f7-49bf-bac6-d8a954269a7c', 'high', null, 8, 'good', 'Helps bind and retain moisture in gappy, high porosity cuticles.'),
  -- Hydroxypropylgluconamide
  ('1269f0eb-8ace-4406-8e51-b4f09f0e3cb6', 'low', null, 5, 'neutral', 'Mild surfactant with skin-conditioning benefit; minimal direct hair effect.'),
  ('1269f0eb-8ace-4406-8e51-b4f09f0e3cb6', 'medium', null, 5, 'neutral', 'Mild surfactant with skin-conditioning benefit.'),
  ('1269f0eb-8ace-4406-8e51-b4f09f0e3cb6', 'high', null, 5, 'neutral', 'Mild surfactant with skin-conditioning benefit.'),
  -- Hydroxypropylammonium Gluconate
  ('35e41eaa-4d60-4bd9-b806-daf13a21422d', 'low', null, 5, 'neutral', 'Mild conditioning agent and pH adjuster with modest direct hair effect.'),
  ('35e41eaa-4d60-4bd9-b806-daf13a21422d', 'medium', null, 5, 'neutral', 'Mild conditioning agent and pH adjuster.'),
  ('35e41eaa-4d60-4bd9-b806-daf13a21422d', 'high', null, 5, 'neutral', 'Mild conditioning agent and pH adjuster.'),
  -- Triethyl Citrate
  ('4b1632d2-f55a-4c94-9536-4b218776fe0c', 'low', null, 5, 'neutral', 'Preservative booster/deodorizing agent with no notable direct effect on hair.'),
  ('4b1632d2-f55a-4c94-9536-4b218776fe0c', 'medium', null, 5, 'neutral', 'Preservative booster with minimal direct conditioning effect.'),
  ('4b1632d2-f55a-4c94-9536-4b218776fe0c', 'high', null, 5, 'neutral', 'Preservative booster with minimal direct conditioning effect.'),
  -- Jojoba Esters
  ('ace8a0ac-1899-4ba4-851f-365dddc803c7', 'low', null, 9, 'good', 'Modified jojoba, lighter than jojoba oil; excellent absorption on tight cuticles.'),
  ('ace8a0ac-1899-4ba4-851f-365dddc803c7', 'medium', null, 8, 'good', 'Lightweight, sebum-like conditioning across most hair types.'),
  ('ace8a0ac-1899-4ba4-851f-365dddc803c7', 'high', null, 8, 'good', 'Lightweight conditioning without adding heaviness.'),
  -- Hydrolyzed Jojoba Esters
  ('0a8bda21-aa31-4479-9eed-e5fc484313ed', 'low', null, 8, 'good', 'Lightweight, protein-like conditioning adds shine without heaviness.'),
  ('0a8bda21-aa31-4479-9eed-e5fc484313ed', 'medium', null, 8, 'good', 'Adds shine and lightweight conditioning.'),
  ('0a8bda21-aa31-4479-9eed-e5fc484313ed', 'high', null, 8, 'good', 'Adds shine without adding heaviness to gappy cuticles.'),
  -- Dicaprylyl Ether
  ('aabdfeed-2a7e-477e-aeec-5d466f017d53', 'low', null, 5, 'neutral', 'Lightweight, silicone-like emollient with minimal buildup risk but limited conditioning benefit.'),
  ('aabdfeed-2a7e-477e-aeec-5d466f017d53', 'medium', null, 5, 'neutral', 'Lightweight emollient with modest conditioning benefit.'),
  ('aabdfeed-2a7e-477e-aeec-5d466f017d53', 'high', null, 5, 'neutral', 'Lightweight emollient; unremarkable but unlikely to cause issues.'),
  -- Polysorbate 60
  ('21a09889-79b5-4538-80be-314daa1cacb0', 'low', null, 5, 'neutral', 'Mild emulsifier with little direct conditioning effect.'),
  ('21a09889-79b5-4538-80be-314daa1cacb0', 'medium', null, 5, 'neutral', 'Helps distribute oils evenly; minimal porosity-specific impact.'),
  ('21a09889-79b5-4538-80be-314daa1cacb0', 'high', null, 5, 'neutral', 'Minimal direct effect on hair; primarily a formulation aid.'),
  -- Disodium Phosphate
  ('c4ddb936-e62c-4c28-964b-95b152800dc4', 'low', null, 5, 'neutral', 'pH buffer with no notable direct effect on hair.'),
  ('c4ddb936-e62c-4c28-964b-95b152800dc4', 'medium', null, 5, 'neutral', 'pH buffer with no notable direct effect on hair.'),
  ('c4ddb936-e62c-4c28-964b-95b152800dc4', 'high', null, 5, 'neutral', 'pH buffer with no notable direct effect on hair.'),
  -- Hydroxypropyltrimonium Honey
  ('88897f3a-efb3-4eb1-a42c-85deabadddf6', 'low', null, 8, 'good', 'Modified honey humectant conditions and adds shine without heaviness.'),
  ('88897f3a-efb3-4eb1-a42c-85deabadddf6', 'medium', null, 8, 'good', 'Conditioning humectant adds shine and softness.'),
  ('88897f3a-efb3-4eb1-a42c-85deabadddf6', 'high', null, 8, 'good', 'Adds shine and softness without adding heaviness.'),
  -- ALS
  ('6963cf95-a3d3-47eb-9279-c8fd1682c58f', 'low', null, 2, 'caution', 'Strong sulfate strips natural oils and moisture; especially drying on already-resistant tight cuticles.'),
  ('6963cf95-a3d3-47eb-9279-c8fd1682c58f', 'medium', null, 2, 'caution', 'Strong sulfate strips natural oils and moisture.'),
  ('6963cf95-a3d3-47eb-9279-c8fd1682c58f', 'high', null, 2, 'caution', 'Strong sulfate strips moisture, compounding dryness in already-porous strands.'),
  -- Ammonium Laureth Sulfate
  ('08ed7233-5746-4812-bc5b-b6bfcfdbd356', 'low', null, 4, 'caution', 'Milder than ALS but still a stripping sulfate for type 4 hair, especially on resistant cuticles.'),
  ('08ed7233-5746-4812-bc5b-b6bfcfdbd356', 'medium', null, 4, 'caution', 'Milder than ALS but can still strip moisture with frequent use.'),
  ('08ed7233-5746-4812-bc5b-b6bfcfdbd356', 'high', null, 4, 'caution', 'Milder than ALS but still a stripping sulfate; compounds dryness on porous strands.'),
  -- Lauryl Glucoside
  ('018a04ec-1902-49e8-844c-e564bc63c540', 'low', null, 8, 'good', 'Gentle, sulfate-free plant-derived cleanser that doesn''t strip moisture.'),
  ('018a04ec-1902-49e8-844c-e564bc63c540', 'medium', null, 8, 'good', 'Mild cleanser well tolerated across hair types.'),
  ('018a04ec-1902-49e8-844c-e564bc63c540', 'high', null, 8, 'good', 'Cleans gently without exacerbating dryness in gappy cuticles.'),
  -- Lauramide DEA
  ('cdf8f5a6-fdd3-46f4-a3dc-2547d1c20100', 'low', null, 5, 'neutral', 'Foam booster and thickener, generally safe at low concentrations with no notable direct effect on hair.'),
  ('cdf8f5a6-fdd3-46f4-a3dc-2547d1c20100', 'medium', null, 5, 'neutral', 'Foam booster and thickener with no notable direct conditioning effect.'),
  ('cdf8f5a6-fdd3-46f4-a3dc-2547d1c20100', 'high', null, 5, 'neutral', 'Foam booster and thickener with no notable direct conditioning effect.')
on conflict do nothing;
