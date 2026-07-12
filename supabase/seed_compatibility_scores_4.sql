-- Ingredients extracted from real Open Beauty Facts ingredient lists for:
--   Eco Style Black Castor & Flaxseed Oil Gel, Mielle Organics Pomegranate
--   & Honey Twisting Souffle, Cantu Shea Butter Leave-In Conditioning Repair
--   Cream, Carol's Daughter Hair Milk, and a same-line SheaMoisture Manuka
--   Honey & Mafura Oil product (the exact Shampoo variant wasn't in OBF; the
--   Conditioner from the same line was used as the closest available proxy).
-- Camille Rose Curl Love Moisture Milk, As I Am Classic Leave In Conditioner,
-- Giovanni Direct Leave In, TGIN Butter Cream Daily Moisturizer, and Aunt
-- Jackie's Don't Shrink Flaxseed Elongating Curl Gel were not retrievable from
-- Open Beauty Facts under any reasonable search variation (or, for Camille
-- Rose, the only match had corrupted/unusable OCR ingredient text), so no
-- ingredients were extracted from them.
--
-- Water/Aqua and a small number of trace anti-caking/colorant duplicates were
-- skipped as non-functional for hair compatibility scoring.

insert into ingredients (id, inci_name, common_name) values
  ('2f3e04e8-05e2-4759-b268-3899ac3cd1aa', 'Cetearyl Alcohol', 'Cetyl-Stearyl Alcohol Blend'),
  ('6f862800-1831-4c1b-8730-9f86f9b29ebe', 'Canola Oil', 'Rapeseed Oil'),
  ('290d8487-1748-411d-be77-91ef2c335970', 'Dicetyldimonium Chloride', 'Dicetyldimonium Chloride'),
  ('176755d7-3291-436d-bdf7-c8f85251c70f', 'Caprylyl Glycerin/Sebacic Acid Copolymer', 'Conditioning Polymer'),
  ('4cdf97de-d24f-40f1-b2d6-71b70433e8d5', 'Diheptyl Succinate', 'Diheptyl Succinate'),
  ('b7c0e7aa-6d54-41dc-a7a0-50a2168ec514', 'Ethylhexylglycerin', 'Sensiva SC50'),
  ('89786fe2-3268-4c50-ac47-b7909f7d050b', 'Polyquaternium-10', 'PQ-10'),
  ('21efbcb1-1df8-4595-85ae-1256dfdd9865', 'Sodium Chloride', 'Table Salt'),
  ('ff497c00-9db2-4597-9750-69a49cb2f500', 'Disodium EDTA', 'Disodium EDTA'),
  ('906f9eb8-a19c-4a4b-ad4e-214e3ea29cce', 'Propylene Glycol Dicaprylate/Dicaprate', 'Propylene Glycol Dicaprylate/Dicaprate'),
  ('473b6a08-e399-4fd0-8178-7ebe02b63821', 'PPG-1 Trideceth-6', 'PPG-1 Trideceth-6'),
  ('7bee034d-794e-41d4-b144-e87eb23610f9', 'Pentaerythrityl Tetracaprylate/Tetracaprate', 'Pentaerythrityl Tetracaprylate/Tetracaprate'),
  ('114e2779-588b-416d-9219-030c46f96c45', 'Citrus Aurantium Dulcis Peel Oil', 'Orange Peel Oil'),
  ('7ddcc49e-ca23-4f7d-943d-7df24bdd8429', 'Hydroxyethylcellulose', 'HEC'),
  ('cfa93174-162b-4abb-a9b9-d63cabd09f03', 'Sodium Hyaluronate', 'Hyaluronic Acid'),
  ('47f97322-bea9-4e75-8cf8-2089a16673d1', 'Hydrolyzed Wheat Protein PG-Propyl Silanetriol', 'Silicone-Modified Wheat Protein'),
  ('8e7bcbc9-0a22-4b41-9e69-48de5546be23', 'Salvia Officinalis Leaf Extract', 'Sage Extract'),
  ('0adb78a4-f080-49be-b452-fd85796f6b23', 'Urtica Dioica Extract', 'Nettle Extract'),
  ('bda37454-8780-4fd5-a58a-db6eae6a1039', 'Rosmarinus Officinalis Leaf Extract', 'Rosemary Extract'),
  ('baec4501-da0b-436d-bc9e-87ef2ff05acb', 'Achillea Millefolium Extract', 'Yarrow Extract'),
  ('5c783f1f-1525-4518-ab5f-68cfd8b8e519', 'Actinidia Chinensis Fruit Extract', 'Kiwi Extract'),
  ('8ed7cd26-6408-44b2-8da3-f4b46a99f1ab', 'Lactobacillus Ferment', 'Probiotic Ferment'),
  ('76960285-bb24-4a49-9b64-5c4a2ab92f01', 'Benzyl Alcohol', 'Benzyl Alcohol'),
  ('14578ee1-85ba-4fdd-9a1d-55b5daba2c4e', 'Potassium Sorbate', 'Potassium Sorbate'),
  ('b45e7bdf-337e-49f2-a40b-1d7b01710fad', 'Sodium Benzoate', 'Sodium Benzoate'),
  ('73b6b729-aa4a-4bc5-8a74-848f1851fc88', 'Sodium Sulfite', 'Sodium Sulfite'),
  ('9e7f0a43-64af-4fd3-883e-0336e39e3ee8', 'Benzyl Salicylate', 'Benzyl Salicylate'),
  ('f5eeb803-703c-4421-b918-c40bc170aa4d', 'Citral', 'Citral'),
  ('7111fac3-4d04-48a6-93ee-32abfd515846', 'Coumarin', 'Coumarin'),
  ('00333296-7775-4ce1-b4c4-08853aa670a7', 'Hexyl Cinnamal', 'Hexyl Cinnamal'),
  ('77586905-5dd2-47a1-986a-c846ccd6459b', 'Limonene', 'D-Limonene'),
  ('cea6a9a2-b0da-4b33-ba74-f549775c6d80', 'Linalool', 'Linalool'),
  ('52352e9a-b4c3-4312-a782-1bfa75ec7954', 'Behentrimonium Chloride', 'BTAC'),
  ('d4fae279-645a-4923-a1dc-9a9ab4b6eb24', 'Hydrolyzed Soy Protein', 'Soy Protein'),
  ('0e4a01a4-6954-49dd-9f68-667ca9bdcca7', 'Hydrolyzed Corn Protein', 'Corn Protein'),
  ('fa2c67c0-868b-427b-ac70-0f82725364e9', 'Tocopheryl Acetate', 'Vitamin E Acetate'),
  ('8042dcc0-75a0-4bdb-b7aa-84ee9639fd74', 'Glycine Soja Oil', 'Soybean Oil'),
  ('d8bedbdd-dd18-4d81-83a3-17fa8e73d016', 'Benzoic Acid', 'Benzoic Acid'),
  ('5e59402e-a0c8-4f66-9bef-1042d42265d2', 'Sorbic Acid', 'Sorbic Acid'),
  ('b7a7e970-0429-49c9-a645-cfe5c1f1ba52', 'Sodium Hydroxide', 'Lye'),
  ('46ae5c26-8916-4187-9f5c-de7d33383802', 'Carbomer', 'Carbopol'),
  ('1d83380e-d0f6-45d0-a0a0-6a72ed26b4a5', 'Triethanolamine', 'TEA'),
  ('a7313a2a-ffb9-4444-a4b0-6210cf870123', 'Polysorbate 20', 'Polysorbate 20'),
  ('580774dd-fe04-4211-a699-065ee1a57759', 'Prunus Amygdalus Dulcis Oil', 'Sweet Almond Oil'),
  ('028437b5-2f6f-4558-a70e-0412d6b2f531', 'Sesamum Indicum Seed Oil', 'Sesame Oil'),
  ('905acb1a-012f-45e5-be0d-8f7f6a1ea002', 'Orbignya Oleifera Seed Oil', 'Babassu Oil'),
  ('1acba663-00d9-4175-b025-a0e655032e47', 'Macadamia Integrifolia Seed Oil', 'Macadamia Oil'),
  ('5cd2aaad-e1d0-492e-9f7f-3db593596231', 'Glyceryl Stearate', 'Glyceryl Stearate'),
  ('472397aa-a764-4fff-bdfe-94c5dbe3097f', 'Punica Granatum Extract', 'Pomegranate Extract'),
  ('84c3a99a-7a37-4a48-ae0a-48b15f493e09', 'Mauritia Flexuosa Fruit Oil', 'Buriti Oil'),
  ('6a08f787-40a7-4b89-857c-b2c942109643', 'Copaifera Officinalis Resin', 'Copaiba Balsam'),
  ('05f40d21-94d0-4928-9ad9-751aeeedf70c', 'Astrocaryum Murumuru Seed Butter', 'Murumuru Butter'),
  ('7b34a581-9acd-48bb-8148-f105adb0b144', 'Glycereth-2 Cocoate', 'Glycereth-2 Cocoate'),
  ('b9b58bb8-f0e9-4a45-97dd-6d5c6676158f', 'Caramel', 'Caramel'),
  ('2c6fd593-5a11-4a2a-8a03-b0afe76d1ebc', 'Cetrimonium Chloride', 'CTAC'),
  ('bcbc521a-a97e-4c93-bd22-2c43f6e806c9', 'Stearyl Alcohol', 'Stearyl Alcohol'),
  ('e06f3bbc-3dcf-4377-82ff-4f3a4d1b8b7e', 'Trichilia Emetica Seed Butter', 'Mafura Butter'),
  ('de11cfba-89a9-4825-bbe5-761168599d3f', 'Diisopropyl Adipate', 'Diisopropyl Adipate'),
  ('406efb78-7857-4b11-b6df-d20f3c90f082', 'Adansonia Digitata Seed Oil', 'Baobab Oil'),
  ('28ec89e8-6cd4-4902-b9a5-3bd1caffd599', 'Hydrolyzed Rice Protein', 'Rice Protein'),
  ('cc699269-1dc7-4acc-b7c5-32f76008b915', 'Ficus Carica Fruit Extract', 'Fig Extract'),
  ('bbf8b05c-a935-429c-9fb2-f51b009cb8fb', 'Tocopherol', 'Vitamin E'),
  ('e304f302-710f-4dc1-b1cf-452c4b59b942', 'Hydrolyzed Vegetable Protein PG-Propyl Silanetriol', 'Silicone-Modified Vegetable Protein'),
  ('dceb5cd4-94c5-4514-8af4-62db471fcf40', 'Caprylyl Glycol', 'Caprylyl Glycol'),
  ('6ce47689-0c86-447c-bd94-8914fbde815f', 'Caprylhydroxamic Acid', 'CHA')
on conflict do nothing;

insert into compatibility_scores (ingredient_id, porosity, score, rating, reason) values
  -- Cetyl-Stearyl Alcohol Blend (from Cantu, Carol's Daughter, Mielle)
  ('2f3e04e8-05e2-4759-b268-3899ac3cd1aa', 'low', 8, 'good', 'Lightweight fatty alcohol blend conditions without overwhelming tight cuticles.'),
  ('2f3e04e8-05e2-4759-b268-3899ac3cd1aa', 'medium', 8, 'good', 'Mild emollient with low buildup risk.'),
  ('2f3e04e8-05e2-4759-b268-3899ac3cd1aa', 'high', 8, 'good', 'Smooths cuticles without heaviness.'),
  -- Rapeseed Oil (from Cantu)
  ('6f862800-1831-4c1b-8730-9f86f9b29ebe', 'low', 7, 'good', 'Light-medium oil absorbs reasonably well without overwhelming tight cuticles.'),
  ('6f862800-1831-4c1b-8730-9f86f9b29ebe', 'medium', 7, 'good', 'Balanced conditioning with manageable weight.'),
  ('6f862800-1831-4c1b-8730-9f86f9b29ebe', 'high', 5, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Dicetyldimonium Chloride (from Cantu)
  ('290d8487-1748-411d-be77-91ef2c335970', 'low', 8, 'good', 'Mild cationic conditioner that detangles without heavy buildup.'),
  ('290d8487-1748-411d-be77-91ef2c335970', 'medium', 8, 'good', 'Gentle, well-tolerated conditioning agent.'),
  ('290d8487-1748-411d-be77-91ef2c335970', 'high', 8, 'good', 'Helps smooth gappy cuticles without weighing hair down.'),
  -- Conditioning Polymer (from Cantu)
  ('176755d7-3291-436d-bdf7-c8f85251c70f', 'low', 5, 'neutral', 'Film-forming conditioning polymer with moderate weight on tight cuticles.'),
  ('176755d7-3291-436d-bdf7-c8f85251c70f', 'medium', 6, 'neutral', 'Moderate conditioning effect with manageable buildup risk.'),
  ('176755d7-3291-436d-bdf7-c8f85251c70f', 'high', 6, 'neutral', 'Helps smooth gappy cuticles somewhat, though not a primary sealant.'),
  -- Diheptyl Succinate (from Cantu)
  ('4cdf97de-d24f-40f1-b2d6-71b70433e8d5', 'low', 7, 'good', 'Lightweight emollient ester absorbs without overwhelming tight cuticles.'),
  ('4cdf97de-d24f-40f1-b2d6-71b70433e8d5', 'medium', 7, 'good', 'Adds slip and light conditioning with low buildup risk.'),
  ('4cdf97de-d24f-40f1-b2d6-71b70433e8d5', 'high', 6, 'neutral', 'Adds slip but less essential since high porosity hair already absorbs moisture readily.'),
  -- Sensiva SC50 (from Cantu, Mielle)
  ('b7c0e7aa-6d54-41dc-a7a0-50a2168ec514', 'low', 5, 'neutral', 'Preservative booster/deodorizing agent with no notable direct effect on hair.'),
  ('b7c0e7aa-6d54-41dc-a7a0-50a2168ec514', 'medium', 5, 'neutral', 'Preservative booster with minimal direct conditioning effect.'),
  ('b7c0e7aa-6d54-41dc-a7a0-50a2168ec514', 'high', 5, 'neutral', 'Preservative booster with minimal direct conditioning effect.'),
  -- PQ-10 (from Cantu)
  ('89786fe2-3268-4c50-ac47-b7909f7d050b', 'low', 7, 'good', 'Lightweight cationic cellulose polymer detangles with minimal buildup on tight cuticles.'),
  ('89786fe2-3268-4c50-ac47-b7909f7d050b', 'medium', 8, 'good', 'Gentle conditioning and detangling with low buildup risk.'),
  ('89786fe2-3268-4c50-ac47-b7909f7d050b', 'high', 8, 'good', 'Smooths and detangles gappy, high porosity cuticles well.'),
  -- Table Salt (from Cantu)
  ('21efbcb1-1df8-4595-85ae-1256dfdd9865', 'low', 4, 'caution', 'Can have a mild drying/thickening effect that compounds dryness on tight, resistant cuticles.'),
  ('21efbcb1-1df8-4595-85ae-1256dfdd9865', 'medium', 5, 'neutral', 'Minor thickening agent with little direct conditioning effect.'),
  ('21efbcb1-1df8-4595-85ae-1256dfdd9865', 'high', 5, 'neutral', 'Minor thickening agent with little direct conditioning effect.'),
  -- Disodium EDTA (from Cantu)
  ('ff497c00-9db2-4597-9750-69a49cb2f500', 'low', 5, 'neutral', 'Chelating agent that improves formula stability; no major direct effect on hair.'),
  ('ff497c00-9db2-4597-9750-69a49cb2f500', 'medium', 5, 'neutral', 'Chelating agent with minimal direct conditioning effect.'),
  ('ff497c00-9db2-4597-9750-69a49cb2f500', 'high', 5, 'neutral', 'Chelating agent with minimal direct conditioning effect.'),
  -- Propylene Glycol Dicaprylate/Dicaprate (from Cantu)
  ('906f9eb8-a19c-4a4b-ad4e-214e3ea29cce', 'low', 7, 'good', 'Lightweight emollient ester absorbs without overwhelming tight cuticles.'),
  ('906f9eb8-a19c-4a4b-ad4e-214e3ea29cce', 'medium', 7, 'good', 'Adds slip and light conditioning with low buildup risk.'),
  ('906f9eb8-a19c-4a4b-ad4e-214e3ea29cce', 'high', 6, 'neutral', 'Adds slip but less essential since high porosity hair already absorbs moisture readily.'),
  -- PPG-1 Trideceth-6 (from Cantu)
  ('473b6a08-e399-4fd0-8178-7ebe02b63821', 'low', 5, 'neutral', 'Mild solubilizer/emulsifier with little direct conditioning effect.'),
  ('473b6a08-e399-4fd0-8178-7ebe02b63821', 'medium', 5, 'neutral', 'Functions mainly to blend ingredients into the formula; minimal porosity-specific impact.'),
  ('473b6a08-e399-4fd0-8178-7ebe02b63821', 'high', 5, 'neutral', 'Minimal direct effect on hair; primarily a formulation aid.'),
  -- Pentaerythrityl Tetracaprylate/Tetracaprate (from Cantu)
  ('7bee034d-794e-41d4-b144-e87eb23610f9', 'low', 7, 'good', 'Lightweight emollient ester absorbs without overwhelming tight cuticles.'),
  ('7bee034d-794e-41d4-b144-e87eb23610f9', 'medium', 7, 'good', 'Adds slip and light conditioning with low buildup risk.'),
  ('7bee034d-794e-41d4-b144-e87eb23610f9', 'high', 6, 'neutral', 'Adds slip but less essential since high porosity hair already absorbs moisture readily.'),
  -- Orange Peel Oil (from Cantu)
  ('114e2779-588b-416d-9219-030c46f96c45', 'low', 5, 'neutral', 'Mostly a fragrance component with minimal direct conditioning effect on the hair shaft.'),
  ('114e2779-588b-416d-9219-030c46f96c45', 'medium', 5, 'neutral', 'Mostly a fragrance component with minimal direct conditioning effect on the hair shaft.'),
  ('114e2779-588b-416d-9219-030c46f96c45', 'high', 5, 'neutral', 'Mostly a fragrance component with minimal direct conditioning effect on the hair shaft.'),
  -- HEC (from Cantu)
  ('7ddcc49e-ca23-4f7d-943d-7df24bdd8429', 'low', 4, 'caution', 'Film-forming thickener can flake and is hard to rinse from tight cuticles.'),
  ('7ddcc49e-ca23-4f7d-943d-7df24bdd8429', 'medium', 5, 'neutral', 'Can flake in some formulas, especially with buildup.'),
  ('7ddcc49e-ca23-4f7d-943d-7df24bdd8429', 'high', 5, 'neutral', 'Flaking risk remains regardless of porosity, though less noticeable on gappy cuticles.'),
  -- Hyaluronic Acid (from Cantu)
  ('cfa93174-162b-4abb-a9b9-d63cabd09f03', 'low', 8, 'good', 'Lightweight humectant that hydrates tight cuticles without heaviness or stickiness.'),
  ('cfa93174-162b-4abb-a9b9-d63cabd09f03', 'medium', 8, 'good', 'Excellent, lightweight hydration with low buildup risk.'),
  ('cfa93174-162b-4abb-a9b9-d63cabd09f03', 'high', 7, 'good', 'Helps draw and hold moisture in gappy, high porosity cuticles.'),
  -- Silicone-Modified Wheat Protein (from Cantu)
  ('47f97322-bea9-4e75-8cf8-2089a16673d1', 'low', 3, 'caution', 'Silicone-modified protein can still build up on tight cuticles and cause stiffness (protein overload).'),
  ('47f97322-bea9-4e75-8cf8-2089a16673d1', 'medium', 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.'),
  ('47f97322-bea9-4e75-8cf8-2089a16673d1', 'high', 8, 'good', 'Helps fill gaps in damaged, gappy cuticles while the silicone component adds smoothing.'),
  -- Sage Extract (from Cantu)
  ('8e7bcbc9-0a22-4b41-9e69-48de5546be23', 'low', 7, 'good', 'Mild botanical extract with soothing benefits and no notable buildup risk.'),
  ('8e7bcbc9-0a22-4b41-9e69-48de5546be23', 'medium', 7, 'good', 'Gentle, broadly compatible botanical extract.'),
  ('8e7bcbc9-0a22-4b41-9e69-48de5546be23', 'high', 7, 'good', 'Soothes without adding heavy buildup.'),
  -- Nettle Extract (from Cantu)
  ('0adb78a4-f080-49be-b452-fd85796f6b23', 'low', 7, 'good', 'Mild botanical extract that supports scalp health without buildup risk.'),
  ('0adb78a4-f080-49be-b452-fd85796f6b23', 'medium', 7, 'good', 'Gentle, broadly compatible botanical extract.'),
  ('0adb78a4-f080-49be-b452-fd85796f6b23', 'high', 7, 'good', 'Supports scalp and strand health without adding heaviness.'),
  -- Rosemary Extract (from Cantu)
  ('bda37454-8780-4fd5-a58a-db6eae6a1039', 'low', 8, 'good', 'Popular scalp-supporting botanical with no notable buildup risk on tight cuticles.'),
  ('bda37454-8780-4fd5-a58a-db6eae6a1039', 'medium', 8, 'good', 'Supports scalp health and shine across most hair types.'),
  ('bda37454-8780-4fd5-a58a-db6eae6a1039', 'high', 8, 'good', 'Supports scalp and strand health without adding heaviness.'),
  -- Yarrow Extract (from Cantu)
  ('baec4501-da0b-436d-bc9e-87ef2ff05acb', 'low', 7, 'good', 'Mild soothing botanical extract with no notable buildup risk.'),
  ('baec4501-da0b-436d-bc9e-87ef2ff05acb', 'medium', 7, 'good', 'Gentle, broadly compatible botanical extract.'),
  ('baec4501-da0b-436d-bc9e-87ef2ff05acb', 'high', 7, 'good', 'Soothes without adding heavy buildup.'),
  -- Kiwi Extract (from Cantu)
  ('5c783f1f-1525-4518-ab5f-68cfd8b8e519', 'low', 6, 'neutral', 'Antioxidant fruit extract with mild, non-specific benefits for hair.'),
  ('5c783f1f-1525-4518-ab5f-68cfd8b8e519', 'medium', 6, 'neutral', 'Antioxidant fruit extract with mild, non-specific benefits for hair.'),
  ('5c783f1f-1525-4518-ab5f-68cfd8b8e519', 'high', 6, 'neutral', 'Antioxidant fruit extract with mild, non-specific benefits for hair.'),
  -- Probiotic Ferment (from Cantu)
  ('8ed7cd26-6408-44b2-8da3-f4b46a99f1ab', 'low', 7, 'good', 'Gentle, pH-balancing ferment filtrate with no notable buildup risk.'),
  ('8ed7cd26-6408-44b2-8da3-f4b46a99f1ab', 'medium', 7, 'good', 'Gentle conditioning with pH-balancing benefits.'),
  ('8ed7cd26-6408-44b2-8da3-f4b46a99f1ab', 'high', 7, 'good', 'Gentle conditioning without adding heaviness.'),
  -- Benzyl Alcohol (from Cantu)
  ('76960285-bb24-4a49-9b64-5c4a2ab92f01', 'low', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('76960285-bb24-4a49-9b64-5c4a2ab92f01', 'medium', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('76960285-bb24-4a49-9b64-5c4a2ab92f01', 'high', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  -- Potassium Sorbate (from Cantu)
  ('14578ee1-85ba-4fdd-9a1d-55b5daba2c4e', 'low', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('14578ee1-85ba-4fdd-9a1d-55b5daba2c4e', 'medium', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('14578ee1-85ba-4fdd-9a1d-55b5daba2c4e', 'high', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  -- Sodium Benzoate (from Cantu)
  ('b45e7bdf-337e-49f2-a40b-1d7b01710fad', 'low', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('b45e7bdf-337e-49f2-a40b-1d7b01710fad', 'medium', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('b45e7bdf-337e-49f2-a40b-1d7b01710fad', 'high', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  -- Sodium Sulfite (from Cantu)
  ('73b6b729-aa4a-4bc5-8a74-848f1851fc88', 'low', 5, 'neutral', 'Antioxidant/preservative with no notable direct effect on hair.'),
  ('73b6b729-aa4a-4bc5-8a74-848f1851fc88', 'medium', 5, 'neutral', 'Antioxidant/preservative with no notable direct effect on hair.'),
  ('73b6b729-aa4a-4bc5-8a74-848f1851fc88', 'high', 5, 'neutral', 'Antioxidant/preservative with no notable direct effect on hair.'),
  -- Benzyl Salicylate (from Cantu)
  ('9e7f0a43-64af-4fd3-883e-0336e39e3ee8', 'low', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('9e7f0a43-64af-4fd3-883e-0336e39e3ee8', 'medium', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('9e7f0a43-64af-4fd3-883e-0336e39e3ee8', 'high', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- Citral (from Cantu)
  ('f5eeb803-703c-4421-b918-c40bc170aa4d', 'low', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('f5eeb803-703c-4421-b918-c40bc170aa4d', 'medium', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('f5eeb803-703c-4421-b918-c40bc170aa4d', 'high', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- Coumarin (from Cantu)
  ('7111fac3-4d04-48a6-93ee-32abfd515846', 'low', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('7111fac3-4d04-48a6-93ee-32abfd515846', 'medium', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('7111fac3-4d04-48a6-93ee-32abfd515846', 'high', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- Hexyl Cinnamal (from Cantu)
  ('00333296-7775-4ce1-b4c4-08853aa670a7', 'low', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('00333296-7775-4ce1-b4c4-08853aa670a7', 'medium', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('00333296-7775-4ce1-b4c4-08853aa670a7', 'high', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- D-Limonene (from Cantu, Eco Style)
  ('77586905-5dd2-47a1-986a-c846ccd6459b', 'low', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('77586905-5dd2-47a1-986a-c846ccd6459b', 'medium', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('77586905-5dd2-47a1-986a-c846ccd6459b', 'high', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- Linalool (from Cantu)
  ('cea6a9a2-b0da-4b33-ba74-f549775c6d80', 'low', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('cea6a9a2-b0da-4b33-ba74-f549775c6d80', 'medium', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  ('cea6a9a2-b0da-4b33-ba74-f549775c6d80', 'high', 5, 'neutral', 'Fragrance component with no notable direct effect on the hair shaft itself.'),
  -- BTAC (from Carol's Daughter, Mielle, SheaMoisture)
  ('52352e9a-b4c3-4312-a782-1bfa75ec7954', 'low', 8, 'good', 'Strong cationic conditioner detangles well without heavy buildup on tight cuticles.'),
  ('52352e9a-b4c3-4312-a782-1bfa75ec7954', 'medium', 8, 'good', 'Effective, well-tolerated conditioning and detangling agent.'),
  ('52352e9a-b4c3-4312-a782-1bfa75ec7954', 'high', 8, 'good', 'Smooths and detangles gappy, high porosity cuticles well.'),
  -- Soy Protein (from Carol's Daughter)
  ('d4fae279-645a-4923-a1dc-9a9ab4b6eb24', 'low', 3, 'caution', 'Protein can build up on tight cuticles and cause stiffness or breakage (protein overload).'),
  ('d4fae279-645a-4923-a1dc-9a9ab4b6eb24', 'medium', 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.'),
  ('d4fae279-645a-4923-a1dc-9a9ab4b6eb24', 'high', 8, 'good', 'Helps temporarily fill gaps in damaged, gappy cuticles and strengthen the strand.'),
  -- Corn Protein (from Carol's Daughter)
  ('0e4a01a4-6954-49dd-9f68-667ca9bdcca7', 'low', 3, 'caution', 'Protein can build up on tight cuticles and cause stiffness or breakage (protein overload).'),
  ('0e4a01a4-6954-49dd-9f68-667ca9bdcca7', 'medium', 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.'),
  ('0e4a01a4-6954-49dd-9f68-667ca9bdcca7', 'high', 8, 'good', 'Helps temporarily fill gaps in damaged, gappy cuticles and strengthen the strand.'),
  -- Vitamin E Acetate (from Carol's Daughter, Mielle, SheaMoisture)
  ('fa2c67c0-868b-427b-ac70-0f82725364e9', 'low', 8, 'good', 'Lightweight antioxidant conditions without overwhelming tight cuticles.'),
  ('fa2c67c0-868b-427b-ac70-0f82725364e9', 'medium', 8, 'good', 'Antioxidant protection with low buildup risk.'),
  ('fa2c67c0-868b-427b-ac70-0f82725364e9', 'high', 8, 'good', 'Antioxidant protection without adding heaviness.'),
  -- Soybean Oil (from Carol's Daughter, SheaMoisture)
  ('8042dcc0-75a0-4bdb-b7aa-84ee9639fd74', 'low', 7, 'good', 'Light-medium oil absorbs reasonably well without overwhelming tight cuticles.'),
  ('8042dcc0-75a0-4bdb-b7aa-84ee9639fd74', 'medium', 7, 'good', 'Balanced conditioning with manageable weight.'),
  ('8042dcc0-75a0-4bdb-b7aa-84ee9639fd74', 'high', 5, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Benzoic Acid (from Carol's Daughter)
  ('d8bedbdd-dd18-4d81-83a3-17fa8e73d016', 'low', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('d8bedbdd-dd18-4d81-83a3-17fa8e73d016', 'medium', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('d8bedbdd-dd18-4d81-83a3-17fa8e73d016', 'high', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  -- Sorbic Acid (from Carol's Daughter)
  ('5e59402e-a0c8-4f66-9bef-1042d42265d2', 'low', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('5e59402e-a0c8-4f66-9bef-1042d42265d2', 'medium', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('5e59402e-a0c8-4f66-9bef-1042d42265d2', 'high', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  -- Lye (from Carol's Daughter)
  ('b7a7e970-0429-49c9-a645-cfe5c1f1ba52', 'low', 5, 'neutral', 'Used in trace amounts as a pH adjuster here; minimal direct effect on hair at this concentration.'),
  ('b7a7e970-0429-49c9-a645-cfe5c1f1ba52', 'medium', 5, 'neutral', 'Used in trace amounts as a pH adjuster; minimal direct effect on hair at this concentration.'),
  ('b7a7e970-0429-49c9-a645-cfe5c1f1ba52', 'high', 5, 'neutral', 'Used in trace amounts as a pH adjuster; minimal direct effect on hair at this concentration.'),
  -- Carbopol (from Eco Style)
  ('46ae5c26-8916-4187-9f5c-de7d33383802', 'low', 5, 'neutral', 'Gel-forming thickener with no notable conditioning effect; can feel tacky on tight cuticles if overused.'),
  ('46ae5c26-8916-4187-9f5c-de7d33383802', 'medium', 6, 'neutral', 'Standard gel-forming agent with manageable buildup risk.'),
  ('46ae5c26-8916-4187-9f5c-de7d33383802', 'high', 6, 'neutral', 'Standard gel-forming agent with manageable buildup risk.'),
  -- TEA (from Eco Style)
  ('1d83380e-d0f6-45d0-a0a0-6a72ed26b4a5', 'low', 4, 'caution', 'pH-neutralizing agent that can be mildly drying on tight, resistant cuticles with frequent use.'),
  ('1d83380e-d0f6-45d0-a0a0-6a72ed26b4a5', 'medium', 5, 'neutral', 'Standard pH neutralizer with minimal direct conditioning effect.'),
  ('1d83380e-d0f6-45d0-a0a0-6a72ed26b4a5', 'high', 5, 'neutral', 'Standard pH neutralizer with minimal direct conditioning effect.'),
  -- Polysorbate 20 (from Eco Style)
  ('a7313a2a-ffb9-4444-a4b0-6210cf870123', 'low', 5, 'neutral', 'Mild solubilizer/emulsifier with little direct conditioning effect.'),
  ('a7313a2a-ffb9-4444-a4b0-6210cf870123', 'medium', 5, 'neutral', 'Functions mainly to blend ingredients into the formula; minimal porosity-specific impact.'),
  ('a7313a2a-ffb9-4444-a4b0-6210cf870123', 'high', 5, 'neutral', 'Minimal direct effect on hair; primarily a formulation aid.'),
  -- Sweet Almond Oil (from Mielle)
  ('580774dd-fe04-4211-a699-065ee1a57759', 'low', 8, 'good', 'Lightweight oil absorbs easily without overwhelming tight cuticles.'),
  ('580774dd-fe04-4211-a699-065ee1a57759', 'medium', 8, 'good', 'Light, fast-absorbing conditioning with low buildup risk.'),
  ('580774dd-fe04-4211-a699-065ee1a57759', 'high', 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Sesame Oil (from Mielle)
  ('028437b5-2f6f-4558-a70e-0412d6b2f531', 'low', 5, 'neutral', 'Moderate-weight oil; workable but not the lightest option for tight cuticles.'),
  ('028437b5-2f6f-4558-a70e-0412d6b2f531', 'medium', 7, 'good', 'Balanced fatty acid profile conditions well without heaviness.'),
  ('028437b5-2f6f-4558-a70e-0412d6b2f531', 'high', 7, 'good', 'Helps condition damaged, gappy cuticles.'),
  -- Babassu Oil (from Mielle)
  ('905acb1a-012f-45e5-be0d-8f7f6a1ea002', 'low', 8, 'good', 'Coconut-like oil that melts at body temperature and absorbs without heaviness.'),
  ('905acb1a-012f-45e5-be0d-8f7f6a1ea002', 'medium', 8, 'good', 'Lightweight conditioning across most hair types.'),
  ('905acb1a-012f-45e5-be0d-8f7f6a1ea002', 'high', 7, 'good', 'Helps seal moisture in gappy, high porosity cuticles without excess heaviness.'),
  -- Macadamia Oil (from Mielle)
  ('1acba663-00d9-4175-b025-a0e655032e47', 'low', 5, 'neutral', 'Moderate-weight oil; workable but not the lightest option for tight cuticles.'),
  ('1acba663-00d9-4175-b025-a0e655032e47', 'medium', 7, 'good', 'Rich fatty acid profile conditions well without excess heaviness.'),
  ('1acba663-00d9-4175-b025-a0e655032e47', 'high', 8, 'good', 'Rich, penetrating oil conditions well in gappy, high porosity cuticles.'),
  -- Glyceryl Stearate (from Mielle)
  ('5cd2aaad-e1d0-492e-9f7f-3db593596231', 'low', 6, 'neutral', 'Mild emulsifier/emollient with manageable weight on tight cuticles.'),
  ('5cd2aaad-e1d0-492e-9f7f-3db593596231', 'medium', 7, 'good', 'Mild emollient with low buildup risk.'),
  ('5cd2aaad-e1d0-492e-9f7f-3db593596231', 'high', 7, 'good', 'Helps smooth gappy cuticles without heaviness.'),
  -- Pomegranate Extract (from Mielle)
  ('472397aa-a764-4fff-bdfe-94c5dbe3097f', 'low', 7, 'good', 'Antioxidant botanical extract with no notable buildup risk.'),
  ('472397aa-a764-4fff-bdfe-94c5dbe3097f', 'medium', 7, 'good', 'Gentle, broadly compatible antioxidant extract.'),
  ('472397aa-a764-4fff-bdfe-94c5dbe3097f', 'high', 7, 'good', 'Antioxidant support without adding heaviness.'),
  -- Buriti Oil (from Mielle)
  ('84c3a99a-7a37-4a48-ae0a-48b15f493e09', 'low', 3, 'caution', 'Rich, heavy oil can sit on tight cuticles and cause buildup without absorbing.'),
  ('84c3a99a-7a37-4a48-ae0a-48b15f493e09', 'medium', 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('84c3a99a-7a37-4a48-ae0a-48b15f493e09', 'high', 8, 'good', 'Rich in fatty acids and carotenoids; conditions well in gappy, high porosity cuticles.'),
  -- Copaiba Balsam (from Mielle)
  ('6a08f787-40a7-4b89-857c-b2c942109643', 'low', 6, 'neutral', 'Mild anti-inflammatory botanical resin with manageable weight.'),
  ('6a08f787-40a7-4b89-857c-b2c942109643', 'medium', 6, 'neutral', 'Mild anti-inflammatory botanical resin with no notable buildup risk.'),
  ('6a08f787-40a7-4b89-857c-b2c942109643', 'high', 6, 'neutral', 'Mild anti-inflammatory botanical resin with no notable buildup risk.'),
  -- Murumuru Butter (from Mielle)
  ('05f40d21-94d0-4928-9ad9-751aeeedf70c', 'low', 3, 'caution', 'Rich, heavy butter can sit on tight cuticles and cause buildup without absorbing.'),
  ('05f40d21-94d0-4928-9ad9-751aeeedf70c', 'medium', 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('05f40d21-94d0-4928-9ad9-751aeeedf70c', 'high', 8, 'good', 'Rich occlusive seals moisture well in gappy, high porosity cuticles.'),
  -- Glycereth-2 Cocoate (from Mielle)
  ('7b34a581-9acd-48bb-8148-f105adb0b144', 'low', 7, 'good', 'Mild coconut-derived emollient/surfactant with low buildup risk.'),
  ('7b34a581-9acd-48bb-8148-f105adb0b144', 'medium', 7, 'good', 'Mild emollient with low buildup risk.'),
  ('7b34a581-9acd-48bb-8148-f105adb0b144', 'high', 7, 'good', 'Helps smooth gappy cuticles without heaviness.'),
  -- Caramel (from Mielle)
  ('b9b58bb8-f0e9-4a45-97dd-6d5c6676158f', 'low', 5, 'neutral', 'Colorant with no functional effect on the hair shaft itself.'),
  ('b9b58bb8-f0e9-4a45-97dd-6d5c6676158f', 'medium', 5, 'neutral', 'Colorant with no functional effect on the hair shaft itself.'),
  ('b9b58bb8-f0e9-4a45-97dd-6d5c6676158f', 'high', 5, 'neutral', 'Colorant with no functional effect on the hair shaft itself.'),
  -- CTAC (from Mielle)
  ('2c6fd593-5a11-4a2a-8a03-b0afe76d1ebc', 'low', 8, 'good', 'Lightweight cationic conditioner detangles well without heavy buildup on tight cuticles.'),
  ('2c6fd593-5a11-4a2a-8a03-b0afe76d1ebc', 'medium', 8, 'good', 'Effective, well-tolerated conditioning and detangling agent.'),
  ('2c6fd593-5a11-4a2a-8a03-b0afe76d1ebc', 'high', 7, 'good', 'Helps detangle gappy, high porosity cuticles without excess heaviness.'),
  -- Stearyl Alcohol (from SheaMoisture)
  ('bcbc521a-a97e-4c93-bd22-2c43f6e806c9', 'low', 8, 'good', 'Lightweight fatty alcohol conditions without overwhelming tight cuticles.'),
  ('bcbc521a-a97e-4c93-bd22-2c43f6e806c9', 'medium', 8, 'good', 'Mild emollient with low buildup risk.'),
  ('bcbc521a-a97e-4c93-bd22-2c43f6e806c9', 'high', 8, 'good', 'Smooths cuticles without heaviness.'),
  -- Mafura Butter (from SheaMoisture)
  ('e06f3bbc-3dcf-4377-82ff-4f3a4d1b8b7e', 'low', 3, 'caution', 'Rich, heavy butter can sit on tight cuticles and cause buildup without absorbing.'),
  ('e06f3bbc-3dcf-4377-82ff-4f3a4d1b8b7e', 'medium', 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('e06f3bbc-3dcf-4377-82ff-4f3a4d1b8b7e', 'high', 8, 'good', 'Rich occlusive seals moisture well in gappy, high porosity cuticles.'),
  -- Diisopropyl Adipate (from SheaMoisture)
  ('de11cfba-89a9-4825-bbe5-761168599d3f', 'low', 8, 'good', 'Lightweight silicone-alternative emollient absorbs easily without overwhelming tight cuticles.'),
  ('de11cfba-89a9-4825-bbe5-761168599d3f', 'medium', 7, 'good', 'Light, fast-absorbing conditioning with low buildup risk.'),
  ('de11cfba-89a9-4825-bbe5-761168599d3f', 'high', 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Baobab Oil (from SheaMoisture)
  ('406efb78-7857-4b11-b6df-d20f3c90f082', 'low', 7, 'good', 'Vitamin-rich, moderate-weight oil absorbs reasonably well without overwhelming tight cuticles.'),
  ('406efb78-7857-4b11-b6df-d20f3c90f082', 'medium', 8, 'good', 'Balanced, nutrient-rich conditioning across most hair types.'),
  ('406efb78-7857-4b11-b6df-d20f3c90f082', 'high', 7, 'good', 'Helps condition damaged, gappy cuticles without excess heaviness.'),
  -- Rice Protein (from SheaMoisture)
  ('28ec89e8-6cd4-4902-b9a5-3bd1caffd599', 'low', 8, 'good', 'Lightweight protein conditions without the stiffness risk of heavier proteins.'),
  ('28ec89e8-6cd4-4902-b9a5-3bd1caffd599', 'medium', 8, 'good', 'Adds softness and strength with minimal buildup risk.'),
  ('28ec89e8-6cd4-4902-b9a5-3bd1caffd599', 'high', 5, 'neutral', 'Lightweight protein offers less gap-filling power than heavier proteins on damaged, high porosity cuticles.'),
  -- Fig Extract (from SheaMoisture)
  ('cc699269-1dc7-4acc-b7c5-32f76008b915', 'low', 7, 'good', 'Antioxidant botanical extract with no notable buildup risk.'),
  ('cc699269-1dc7-4acc-b7c5-32f76008b915', 'medium', 7, 'good', 'Gentle, broadly compatible antioxidant extract.'),
  ('cc699269-1dc7-4acc-b7c5-32f76008b915', 'high', 7, 'good', 'Antioxidant support without adding heaviness.'),
  -- Vitamin E (from SheaMoisture)
  ('bbf8b05c-a935-429c-9fb2-f51b009cb8fb', 'low', 8, 'good', 'Lightweight antioxidant conditions without overwhelming tight cuticles.'),
  ('bbf8b05c-a935-429c-9fb2-f51b009cb8fb', 'medium', 8, 'good', 'Antioxidant protection with low buildup risk.'),
  ('bbf8b05c-a935-429c-9fb2-f51b009cb8fb', 'high', 8, 'good', 'Antioxidant protection without adding heaviness.'),
  -- Silicone-Modified Vegetable Protein (from SheaMoisture)
  ('e304f302-710f-4dc1-b1cf-452c4b59b942', 'low', 3, 'caution', 'Silicone-modified protein can still build up on tight cuticles and cause stiffness (protein overload).'),
  ('e304f302-710f-4dc1-b1cf-452c4b59b942', 'medium', 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.'),
  ('e304f302-710f-4dc1-b1cf-452c4b59b942', 'high', 8, 'good', 'Helps fill gaps in damaged, gappy cuticles while the silicone component adds smoothing.'),
  -- Caprylyl Glycol (from SheaMoisture)
  ('dceb5cd4-94c5-4514-8af4-62db471fcf40', 'low', 7, 'good', 'Lightweight preservative-booster humectant hydrates without overwhelming tight cuticles.'),
  ('dceb5cd4-94c5-4514-8af4-62db471fcf40', 'medium', 7, 'good', 'Adds light moisture with low buildup risk.'),
  ('dceb5cd4-94c5-4514-8af4-62db471fcf40', 'high', 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- CHA (from SheaMoisture)
  ('6ce47689-0c86-447c-bd94-8914fbde815f', 'low', 5, 'neutral', 'Standard PHB-free preservative with no notable direct effect on hair.'),
  ('6ce47689-0c86-447c-bd94-8914fbde815f', 'medium', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('6ce47689-0c86-447c-bd94-8914fbde815f', 'high', 5, 'neutral', 'Standard preservative with no notable direct effect on hair.')
on conflict do nothing;
