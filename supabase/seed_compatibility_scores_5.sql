-- Ingredients requested for the compatibility_scores expansion.
-- 11 of the 50 requested were already in the table and skipped:
-- Sea Moss Extract, Shea Butter, Cocoa Butter, Mango Butter, Honey,
-- Vegetable Glycerin (same ingredient as the existing Glycerin row,
-- which already has humid/dry climate_modifier logic), Jojoba Oil,
-- Grapeseed Oil, Sorbitol, Cetyl Alcohol, and Olive Oil.
--
-- 4 more were removed after this file was first written: Prunus
-- Amygdalus Dulcis Oil (Sweet Almond Oil), Sesamum Indicum Seed Oil
-- (Sesame Oil), Polysorbate 20, and Glycereth-2 Cocoate all turned out
-- to already exist in seed_compatibility_scores_4.sql under different
-- ids. Once seed_4 ran, this file's ON CONFLICT DO NOTHING silently
-- skipped inserting its own (duplicate-name) ingredient rows for
-- those four, which orphaned their compatibility_scores rows and
-- broke the foreign key. They're scored via seed_4's rows instead.
--
-- Melaleuca Alternifolia Leaf Oil (Tea Tree), Mentha Piperita Oil
-- (Peppermint), Rosmarinus Officinalis Leaf Oil (Rosemary), Menthol,
-- and Lavandula Angustifolia Oil (Lavender) each also get extra
-- scalp_condition-specific rows (oily/dandruff/sensitive) alongside
-- their base porosity rows, matching the existing Fragrance/DMDM
-- Hydantoin pattern already in the table.

insert into ingredients (id, inci_name, common_name) values
  ('1adec79b-b2a0-4dbb-84fb-4d55648fef52', 'Pectin', 'Pectin'),
  ('de70e6e7-56b8-4a0b-9532-bee5c7390f95', 'Althaea Officinalis Root Extract', 'Marshmallow Root Extract'),
  ('f0f23997-7137-48db-9211-65a9c42679c8', 'Agave Americana Leaf Extract', 'Agave Extract'),
  ('540bb004-ab2c-461f-9c30-6c873f999d70', 'Equisetum Arvense Extract', 'Horsetail Extract'),
  ('7d2806c6-cdd3-4ba5-802d-231f0e08a578', 'Urtica Dioica Leaf Extract', 'Nettle Leaf Extract'),
  ('e6cae715-5839-471a-94bd-62ef1a865a12', 'Cyanocobalamin', 'Vitamin B-12'),
  ('122d4b3e-d7c7-402d-b00a-5d461ef8d21e', 'Xanthan Gum', 'Xanthan Gum'),
  ('a14e9d79-c621-4f64-bdaa-59c493abac11', 'Cannabis Sativa Seed Oil', 'Hemp Seed Oil'),
  ('b675acfe-0186-42a9-a2c8-de3d9cfa6fec', 'Oenothera Biennis Oil', 'Evening Primrose Oil'),
  ('6557262a-ca5b-4fe8-b8e1-97a05d87f9d1', 'Blue Green Algae', 'Blue Green Algae'),
  ('93eaa0b3-cdff-4799-86f8-57df1b04d5cd', 'Biotin', 'Vitamin B7'),
  ('9e040170-bc81-4e5e-a0f2-7ee05f4f251d', 'Methylsulfonylmethane', 'MSM'),
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'Mentha Piperita Oil', 'Peppermint Oil'),
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'Rosmarinus Officinalis Leaf Oil', 'Rosemary Leaf Oil'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'Melaleuca Alternifolia Leaf Oil', 'Tea Tree Oil'),
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'Menthol', 'Menthol'),
  ('31dc6d91-9162-48b9-9e3f-d3df17f4b4bc', 'Ethylhexyl Palmitate', 'Ethylhexyl Palmitate'),
  ('ec0cdd22-729c-42df-8a21-e0d4bd3db1cc', 'Emblica Officinalis Fruit Extract', 'Amla Extract'),
  ('f9fb4468-9f7c-4367-a663-02a1fc6de20b', 'Acacia Concinna Fruit Extract', 'Shikakai Extract'),
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'Lavandula Angustifolia Oil', 'Lavender Oil'),
  ('8845cc89-dabf-453c-9965-12d189cc4ea4', 'Pogostemon Cablin Oil', 'Patchouli Oil'),
  ('109e8dfd-9c95-4804-bbe6-82746e207293', 'Cucurbita Pepo Seed Oil', 'Pumpkin Seed Oil'),
  ('633bd53b-a688-40fc-a754-7ad9d9499420', 'Ulmus Fulva Bark Extract', 'Slippery Elm Bark Extract'),
  ('db94e321-8e0c-4639-b9a0-1674c934caf7', 'Camellia Sinensis Leaf Extract', 'Green Tea Extract'),
  ('56185b3c-8241-4d96-add1-45ce22d19ec4', 'Macadamia Ternifolia Seed Oil', 'Macadamia Oil'),
  ('981f5946-4719-443b-b352-afee17ee1076', 'Rosa Canina Fruit Oil', 'Rosehip Oil'),
  ('914cc8bf-158c-4af6-a610-a199c5e2af59', 'Hydrolyzed Corn Starch', 'Hydrolyzed Corn Starch'),
  ('04c1f06d-bc42-49f6-ae46-0972ab782569', 'PEG-7 Glyceryl Cocoate', 'PEG-7 Glyceryl Cocoate'),
  ('04ef5e9e-e9fb-4b28-8ecb-70864f6bce87', 'Withania Somnifera Root Extract', 'Ashwagandha Root Extract'),
  ('dfa9db20-07a6-43d2-9f74-51bff7140ba6', 'Rubus Idaeus Leaf Extract', 'Raspberry Leaf Extract'),
  ('616d5bf9-7d60-40af-99bf-982c3c9894c0', 'Melissa Officinalis Leaf Extract', 'Melissa Leaf Extract'),
  ('7ad86cbe-8bb5-46c4-894b-d262d613324b', 'Yucca Leaf Extract', 'Yucca Extract'),
  ('a6a3c646-9f84-40a5-bd4a-a40c10de2d78', 'Oryza Sativa Milk', 'Rice Milk'),
  ('14f5ade9-2895-4d88-a8a8-6dcfab617d78', 'Oryza Sativa Bran Oil', 'Rice Bran Oil'),
  ('90b47f5a-2c3e-499b-89ee-a28a1cbb9844', 'Disodium Cocoamphodipropionate', 'Disodium Cocoamphodipropionate')
on conflict do nothing;

insert into compatibility_scores (ingredient_id, porosity, scalp_condition, score, rating, reason) values
  -- Pectin
  ('1adec79b-b2a0-4dbb-84fb-4d55648fef52', 'low', null, 8, 'good', 'Natural film-former defines curls without silicone-style buildup.'),
  ('1adec79b-b2a0-4dbb-84fb-4d55648fef52', 'medium', null, 8, 'good', 'Provides curl definition and hold without heaviness.'),
  ('1adec79b-b2a0-4dbb-84fb-4d55648fef52', 'high', null, 8, 'good', 'Defines curls without adding buildup to gappy cuticles.'),
  -- Marshmallow Root Extract
  ('de70e6e7-56b8-4a0b-9532-bee5c7390f95', 'low', null, 8, 'good', 'Provides slip and detangling with lightweight moisture.'),
  ('de70e6e7-56b8-4a0b-9532-bee5c7390f95', 'medium', null, 8, 'good', 'Gentle, mucilage-rich extract adds slip and moisture.'),
  ('de70e6e7-56b8-4a0b-9532-bee5c7390f95', 'high', null, 8, 'good', 'Lightweight moisture and slip without heaviness.'),
  -- Agave Extract
  ('f0f23997-7137-48db-9211-65a9c42679c8', 'low', null, 8, 'good', 'Lightweight humectant balances moisture without heaviness.'),
  ('f0f23997-7137-48db-9211-65a9c42679c8', 'medium', null, 8, 'good', 'Balances moisture without adding heaviness.'),
  ('f0f23997-7137-48db-9211-65a9c42679c8', 'high', null, 8, 'good', 'Adds moisture without overwhelming gappy cuticles.'),
  -- Horsetail Extract
  ('540bb004-ab2c-461f-9c30-6c873f999d70', 'low', null, 8, 'good', 'Mineral-rich extract strengthens the strand and improves elasticity.'),
  ('540bb004-ab2c-461f-9c30-6c873f999d70', 'medium', null, 8, 'good', 'Strengthens strand and improves elasticity.'),
  ('540bb004-ab2c-461f-9c30-6c873f999d70', 'high', null, 8, 'good', 'Helps reinforce elasticity in damaged, gappy cuticles.'),
  -- Nettle Leaf Extract
  ('7d2806c6-cdd3-4ba5-802d-231f0e08a578', 'low', null, 8, 'good', 'Supports scalp health and strengthens hair without buildup.'),
  ('7d2806c6-cdd3-4ba5-802d-231f0e08a578', 'medium', null, 8, 'good', 'Promotes scalp health and strand strength.'),
  ('7d2806c6-cdd3-4ba5-802d-231f0e08a578', 'high', null, 8, 'good', 'Strengthens strand and supports scalp health.'),
  -- Vitamin B-12
  ('e6cae715-5839-471a-94bd-62ef1a865a12', 'low', null, 8, 'good', 'Supports scalp health and hair growth without buildup.'),
  ('e6cae715-5839-471a-94bd-62ef1a865a12', 'medium', null, 8, 'good', 'Supports scalp health and healthy hair growth.'),
  ('e6cae715-5839-471a-94bd-62ef1a865a12', 'high', null, 8, 'good', 'Supports scalp health and growth without adding heaviness.'),
  -- Xanthan Gum
  ('122d4b3e-d7c7-402d-b00a-5d461ef8d21e', 'low', null, 8, 'good', 'Natural thickener adds hold and definition without heavy buildup.'),
  ('122d4b3e-d7c7-402d-b00a-5d461ef8d21e', 'medium', null, 8, 'good', 'Adds hold and definition with manageable buildup risk.'),
  ('122d4b3e-d7c7-402d-b00a-5d461ef8d21e', 'high', null, 6, 'neutral', 'Provides hold and definition, though less essential since high porosity hair already holds product well.'),
  -- Hemp Seed Oil
  ('a14e9d79-c621-4f64-bdaa-59c493abac11', 'low', null, 8, 'good', 'Lightweight oil high in linoleic acid absorbs without clogging or heaviness.'),
  ('a14e9d79-c621-4f64-bdaa-59c493abac11', 'medium', null, 8, 'good', 'Lightweight, balanced fatty acid profile conditions without heaviness.'),
  ('a14e9d79-c621-4f64-bdaa-59c493abac11', 'high', null, 8, 'good', 'Lightweight conditioning that doesn''t overwhelm gappy cuticles.'),
  -- Evening Primrose Oil
  ('b675acfe-0186-42a9-a2c8-de3d9cfa6fec', 'low', null, 5, 'neutral', 'Rich oil is workable but not the lightest option for tight cuticles.'),
  ('b675acfe-0186-42a9-a2c8-de3d9cfa6fec', 'medium', null, 7, 'good', 'GLA-rich oil conditions well without excess heaviness.'),
  ('b675acfe-0186-42a9-a2c8-de3d9cfa6fec', 'high', null, 9, 'good', 'Rich in GLA; helps repair and condition damaged, gappy cuticles.'),
  -- Blue Green Algae
  ('6557262a-ca5b-4fe8-b8e1-97a05d87f9d1', 'low', null, 8, 'good', 'Antioxidant-rich extract strengthens the strand without buildup.'),
  ('6557262a-ca5b-4fe8-b8e1-97a05d87f9d1', 'medium', null, 8, 'good', 'Strengthens strand with antioxidant support.'),
  ('6557262a-ca5b-4fe8-b8e1-97a05d87f9d1', 'high', null, 8, 'good', 'Strengthens strand without adding heaviness.'),
  -- Vitamin B7
  ('93eaa0b3-cdff-4799-86f8-57df1b04d5cd', 'low', null, 8, 'good', 'Supports keratin production and scalp health without buildup.'),
  ('93eaa0b3-cdff-4799-86f8-57df1b04d5cd', 'medium', null, 8, 'good', 'Supports keratin production and scalp health.'),
  ('93eaa0b3-cdff-4799-86f8-57df1b04d5cd', 'high', null, 8, 'good', 'Supports keratin production without adding heaviness.'),
  -- MSM
  ('9e040170-bc81-4e5e-a0f2-7ee05f4f251d', 'low', null, 8, 'good', 'Sulfur compound supports keratin production without buildup.'),
  ('9e040170-bc81-4e5e-a0f2-7ee05f4f251d', 'medium', null, 8, 'good', 'Supports collagen and keratin production.'),
  ('9e040170-bc81-4e5e-a0f2-7ee05f4f251d', 'high', null, 8, 'good', 'Supports keratin production without adding heaviness.'),
  -- Peppermint Oil
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'low', null, 7, 'good', 'Stimulates scalp circulation; no direct porosity-specific effect but supports overall scalp health.'),
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'medium', null, 7, 'good', 'Stimulates scalp circulation with no notable buildup risk.'),
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'high', null, 7, 'good', 'Stimulates scalp circulation without adding heaviness.'),
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'low', 'sensitive', 3, 'caution', 'Potent essential oil can irritate sensitive scalps despite its circulation benefits for others.'),
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'medium', 'sensitive', 3, 'caution', 'Potent essential oil can irritate sensitive scalps despite its circulation benefits for others.'),
  ('0cb764da-1aa2-47da-88c1-7d60bceeaa4b', 'high', 'sensitive', 3, 'caution', 'Potent essential oil can irritate sensitive scalps despite its circulation benefits for others.'),
  -- Rosemary Leaf Oil
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'low', null, 8, 'good', 'Stimulates the scalp and provides antioxidant support without buildup.'),
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'medium', null, 8, 'good', 'Stimulates scalp and provides antioxidant protection.'),
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'high', null, 8, 'good', 'Stimulates scalp without adding heaviness.'),
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'low', 'sensitive', 3, 'caution', 'Stimulating essential oil can irritate sensitive scalps.'),
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'medium', 'sensitive', 3, 'caution', 'Stimulating essential oil can irritate sensitive scalps.'),
  ('09f42d5c-fea6-4856-ac77-50c1746c3838', 'high', 'sensitive', 3, 'caution', 'Stimulating essential oil can irritate sensitive scalps.'),
  -- Tea Tree Oil
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'low', null, 5, 'neutral', 'Antimicrobial oil with targeted scalp benefits; most useful for oily or dandruff-prone scalp rather than universally.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'medium', null, 5, 'neutral', 'Targeted antimicrobial benefit; not broadly moisturizing or conditioning.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'high', null, 5, 'neutral', 'Targeted antimicrobial benefit; not broadly moisturizing or conditioning.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'low', 'oily', 8, 'good', 'Antimicrobial properties help control excess oil and scalp buildup.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'medium', 'oily', 8, 'good', 'Antimicrobial properties help control excess oil and scalp buildup.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'high', 'oily', 8, 'good', 'Antimicrobial properties help control excess oil and scalp buildup.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'low', 'dandruff', 8, 'good', 'Antifungal/antimicrobial properties help address dandruff-causing yeast and buildup.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'medium', 'dandruff', 8, 'good', 'Antifungal/antimicrobial properties help address dandruff-causing yeast and buildup.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'high', 'dandruff', 8, 'good', 'Antifungal/antimicrobial properties help address dandruff-causing yeast and buildup.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'low', 'sensitive', 3, 'caution', 'Potent essential oil; can irritate sensitive, reactive scalps.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'medium', 'sensitive', 3, 'caution', 'Potent essential oil; can irritate sensitive, reactive scalps.'),
  ('c6196846-683e-4535-b5b5-e2ad72aca162', 'high', 'sensitive', 3, 'caution', 'Potent essential oil; can irritate sensitive, reactive scalps.'),
  -- Menthol
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'low', null, 5, 'neutral', 'Cooling sensation only; no direct moisture impact.'),
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'medium', null, 5, 'neutral', 'Cooling sensation only; no direct moisture impact.'),
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'high', null, 5, 'neutral', 'Cooling sensation only; no direct moisture impact.'),
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'low', 'sensitive', 3, 'caution', 'Cooling agent can irritate or sting sensitive scalps.'),
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'medium', 'sensitive', 3, 'caution', 'Cooling agent can irritate or sting sensitive scalps.'),
  ('e6d4ecaa-fb46-4de4-ac7a-0c6c6a3f0d95', 'high', 'sensitive', 3, 'caution', 'Cooling agent can irritate or sting sensitive scalps.'),
  -- Ethylhexyl Palmitate
  ('31dc6d91-9162-48b9-9e3f-d3df17f4b4bc', 'low', null, 5, 'neutral', 'Lightweight emollient with minimal buildup risk but limited conditioning benefit.'),
  ('31dc6d91-9162-48b9-9e3f-d3df17f4b4bc', 'medium', null, 5, 'neutral', 'Lightweight, non-comedogenic emollient with modest conditioning benefit.'),
  ('31dc6d91-9162-48b9-9e3f-d3df17f4b4bc', 'high', null, 5, 'neutral', 'Lightweight emollient; unremarkable but unlikely to cause issues.'),
  -- Amla Extract
  ('ec0cdd22-729c-42df-8a21-e0d4bd3db1cc', 'low', null, 8, 'good', 'Antioxidant extract strengthens hair and promotes growth without buildup.'),
  ('ec0cdd22-729c-42df-8a21-e0d4bd3db1cc', 'medium', null, 8, 'good', 'Strengthens hair and promotes growth.'),
  ('ec0cdd22-729c-42df-8a21-e0d4bd3db1cc', 'high', null, 8, 'good', 'Strengthens strand and supports growth without heaviness.'),
  -- Shikakai Extract
  ('f9fb4468-9f7c-4367-a663-02a1fc6de20b', 'low', null, 8, 'good', 'Gentle natural cleanser that strengthens strand without stripping moisture.'),
  ('f9fb4468-9f7c-4367-a663-02a1fc6de20b', 'medium', null, 8, 'good', 'Gentle cleansing with strengthening benefits.'),
  ('f9fb4468-9f7c-4367-a663-02a1fc6de20b', 'high', null, 8, 'good', 'Gentle cleansing that supports strand strength.'),
  -- Lavender Oil
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'low', null, 5, 'neutral', 'Mild scalp benefit; primarily a fragrance component.'),
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'medium', null, 5, 'neutral', 'Mild scalp benefit; primarily a fragrance component.'),
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'high', null, 5, 'neutral', 'Mild scalp benefit; primarily a fragrance component.'),
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'low', 'sensitive', 3, 'caution', 'Fragrance oil is a common irritant/allergen trigger for sensitive scalps.'),
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'medium', 'sensitive', 3, 'caution', 'Fragrance oil is a common irritant/allergen trigger for sensitive scalps.'),
  ('423538d8-275b-4897-84ca-a5b414dbb418', 'high', 'sensitive', 3, 'caution', 'Fragrance oil is a common irritant/allergen trigger for sensitive scalps.'),
  -- Patchouli Oil
  ('8845cc89-dabf-453c-9965-12d189cc4ea4', 'low', null, 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('8845cc89-dabf-453c-9965-12d189cc4ea4', 'medium', null, 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('8845cc89-dabf-453c-9965-12d189cc4ea4', 'high', null, 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- Pumpkin Seed Oil
  ('109e8dfd-9c95-4804-bbe6-82746e207293', 'low', null, 8, 'good', 'High in zinc and antioxidants; supports scalp health without heaviness.'),
  ('109e8dfd-9c95-4804-bbe6-82746e207293', 'medium', null, 8, 'good', 'Supports scalp health with antioxidant and zinc content.'),
  ('109e8dfd-9c95-4804-bbe6-82746e207293', 'high', null, 8, 'good', 'Supports scalp health without adding heaviness.'),
  -- Slippery Elm Bark Extract
  ('633bd53b-a688-40fc-a754-7ad9d9499420', 'low', null, 8, 'good', 'Provides slip and soothing moisture without buildup.'),
  ('633bd53b-a688-40fc-a754-7ad9d9499420', 'medium', null, 8, 'good', 'Provides slip, moisture, and scalp soothing.'),
  ('633bd53b-a688-40fc-a754-7ad9d9499420', 'high', null, 8, 'good', 'Provides slip and moisture without heaviness.'),
  -- Green Tea Extract
  ('db94e321-8e0c-4639-b9a0-1674c934caf7', 'low', null, 8, 'good', 'Antioxidant extract reduces scalp inflammation without buildup.'),
  ('db94e321-8e0c-4639-b9a0-1674c934caf7', 'medium', null, 8, 'good', 'Antioxidant support and reduced scalp inflammation.'),
  ('db94e321-8e0c-4639-b9a0-1674c934caf7', 'high', null, 8, 'good', 'Antioxidant support without adding heaviness.'),
  -- Macadamia Oil
  ('56185b3c-8241-4d96-add1-45ce22d19ec4', 'low', null, 8, 'good', 'High oleic acid content penetrates well without heaviness.'),
  ('56185b3c-8241-4d96-add1-45ce22d19ec4', 'medium', null, 8, 'good', 'Penetrating, lightweight conditioning with high oleic acid.'),
  ('56185b3c-8241-4d96-add1-45ce22d19ec4', 'high', null, 8, 'good', 'Penetrating oil conditions gappy cuticles without heaviness.'),
  -- Rosehip Oil
  ('981f5946-4719-443b-b352-afee17ee1076', 'low', null, 8, 'good', 'High linoleic acid content repairs and conditions without heaviness.'),
  ('981f5946-4719-443b-b352-afee17ee1076', 'medium', null, 8, 'good', 'Repairs cuticle and provides antioxidant protection.'),
  ('981f5946-4719-443b-b352-afee17ee1076', 'high', null, 8, 'good', 'High linoleic acid helps repair damaged, gappy cuticles.'),
  -- Hydrolyzed Corn Starch
  ('914cc8bf-158c-4af6-a610-a199c5e2af59', 'low', null, 8, 'good', 'Lightweight hold with no buildup risk on tight cuticles.'),
  ('914cc8bf-158c-4af6-a610-a199c5e2af59', 'medium', null, 8, 'good', 'Lightweight hold and definition without buildup.'),
  ('914cc8bf-158c-4af6-a610-a199c5e2af59', 'high', null, 5, 'neutral', 'Provides light hold, though less essential since high porosity hair already holds product well.'),
  -- PEG-7 Glyceryl Cocoate
  ('04c1f06d-bc42-49f6-ae46-0972ab782569', 'low', null, 5, 'neutral', 'Mild coconut-derived emulsifier with little direct conditioning effect.'),
  ('04c1f06d-bc42-49f6-ae46-0972ab782569', 'medium', null, 5, 'neutral', 'Mild emulsifier with minimal porosity-specific impact.'),
  ('04c1f06d-bc42-49f6-ae46-0972ab782569', 'high', null, 5, 'neutral', 'Mild emulsifier with minimal direct conditioning effect.'),
  -- Ashwagandha Root Extract
  ('04ef5e9e-e9fb-4b28-8ecb-70864f6bce87', 'low', null, 8, 'good', 'Adaptogenic extract reduces scalp stress response and strengthens strand.'),
  ('04ef5e9e-e9fb-4b28-8ecb-70864f6bce87', 'medium', null, 8, 'good', 'Reduces scalp stress response and strengthens strand.'),
  ('04ef5e9e-e9fb-4b28-8ecb-70864f6bce87', 'high', null, 8, 'good', 'Strengthens strand and supports scalp health without heaviness.'),
  -- Raspberry Leaf Extract
  ('dfa9db20-07a6-43d2-9f74-51bff7140ba6', 'low', null, 8, 'good', 'Antioxidant extract soothes the scalp without buildup.'),
  ('dfa9db20-07a6-43d2-9f74-51bff7140ba6', 'medium', null, 8, 'good', 'Antioxidant support with scalp-soothing benefits.'),
  ('dfa9db20-07a6-43d2-9f74-51bff7140ba6', 'high', null, 8, 'good', 'Scalp-soothing antioxidant support without heaviness.'),
  -- Melissa Leaf Extract
  ('616d5bf9-7d60-40af-99bf-982c3c9894c0', 'low', null, 5, 'neutral', 'Mild antioxidant with light scalp benefit.'),
  ('616d5bf9-7d60-40af-99bf-982c3c9894c0', 'medium', null, 5, 'neutral', 'Mild antioxidant with light scalp benefit.'),
  ('616d5bf9-7d60-40af-99bf-982c3c9894c0', 'high', null, 5, 'neutral', 'Mild antioxidant with light scalp benefit.'),
  -- Yucca Extract
  ('7ad86cbe-8bb5-46c4-894b-d262d613324b', 'low', null, 8, 'good', 'Natural saponins cleanse gently while strengthening the strand.'),
  ('7ad86cbe-8bb5-46c4-894b-d262d613324b', 'medium', null, 8, 'good', 'Gentle cleansing that strengthens the strand.'),
  ('7ad86cbe-8bb5-46c4-894b-d262d613324b', 'high', null, 8, 'good', 'Gentle cleansing that supports strand strength.'),
  -- Rice Milk
  ('a6a3c646-9f84-40a5-bd4a-a40c10de2d78', 'low', null, 8, 'good', 'Protein-rich and gentle; strengthens strand and adds shine without overload.'),
  ('a6a3c646-9f84-40a5-bd4a-a40c10de2d78', 'medium', null, 8, 'good', 'Strengthens strand and adds shine.'),
  ('a6a3c646-9f84-40a5-bd4a-a40c10de2d78', 'high', null, 8, 'good', 'Strengthens strand and adds shine without heaviness.'),
  -- Rice Bran Oil
  ('14f5ade9-2895-4d88-a8a8-6dcfab617d78', 'low', null, 8, 'good', 'Lightweight oil with gamma-oryzanol antioxidant absorbs well.'),
  ('14f5ade9-2895-4d88-a8a8-6dcfab617d78', 'medium', null, 8, 'good', 'Lightweight antioxidant conditioning with low buildup risk.'),
  ('14f5ade9-2895-4d88-a8a8-6dcfab617d78', 'high', null, 6, 'neutral', 'Lightweight oil is beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Disodium Cocoamphodipropionate
  ('90b47f5a-2c3e-499b-89ee-a28a1cbb9844', 'low', null, 5, 'neutral', 'Mild amphoteric, sulfate-free cleanser with modest conditioning effect.'),
  ('90b47f5a-2c3e-499b-89ee-a28a1cbb9844', 'medium', null, 5, 'neutral', 'Gentle cleansing with minimal direct conditioning effect.'),
  ('90b47f5a-2c3e-499b-89ee-a28a1cbb9844', 'high', null, 5, 'neutral', 'Gentle cleansing with minimal direct conditioning effect.')
on conflict do nothing;
