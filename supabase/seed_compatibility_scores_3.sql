-- Aloe Barbadensis Leaf Juice, Panthenol, Dimethicone, and Shea Butter
-- already exist from earlier batches with scores matching this request
-- exactly, so they are intentionally not re-inserted here.

insert into ingredients (id, inci_name, common_name) values
  ('7049b76d-c2d8-46bb-b4d3-fd89b8fe8536', 'Mel', 'Honey'),
  ('6d7802e7-bfaf-4434-b47d-bc9182013461', 'Propanediol', 'Zemea'),
  ('1b4e9af7-d9a0-4a64-a755-0063d75b5316', 'Simmondsia Chinensis Seed Oil', 'Jojoba Oil'),
  ('99c075f0-27be-428f-8c8e-31e42e67fc80', 'Argania Spinosa Kernel Oil', 'Argan Oil'),
  ('48e620fd-97bd-49cc-9095-93c5bbf0f4bf', 'Vitis Vinifera Seed Oil', 'Grapeseed Oil'),
  ('730e3bd5-8be2-4362-9c5e-c04898e54bfb', 'Persea Gratissima Oil', 'Avocado Oil'),
  ('e7539979-3f21-4967-9b87-f88f25638a81', 'Olea Europaea Fruit Oil', 'Olive Oil'),
  ('0baa13d6-978e-44b6-affc-19c5c08f3867', 'Helianthus Annuus Seed Oil', 'Sunflower Oil'),
  ('3a6a17df-2a15-4a05-b4fd-168c4294d044', 'Jamaican Black Castor Oil', 'Jamaican Black Castor Oil'),
  ('01446258-a4b5-40fe-b8d7-c9e6a5f41ff9', 'Linum Usitatissimum Seed Oil', 'Flaxseed Oil'),
  ('cb51ba16-1e28-4b03-a7cc-59c0ebf305a2', 'Hydrolyzed Keratin', 'Keratin Protein'),
  ('eb2c70f9-ea79-4194-8df5-17aaff7c8f2d', 'Hydrolyzed Silk', 'Silk Amino Acids'),
  ('76d9e4d1-261e-460a-83a3-efa810b6a878', 'Hydrolyzed Quinoa', 'Quinoa Protein'),
  ('790dcb5b-88b8-4403-9090-bcc73577dc93', 'Sodium Lauryl Sulfate', 'SLS'),
  ('a126fd6d-fe4b-4072-97f2-70bfdb993925', 'Sodium Laureth Sulfate', 'SLES'),
  ('2fa4c00a-fa72-4fe0-a9eb-cbef500a0619', 'Cocamidopropyl Betaine', 'CAPB'),
  ('a5743f71-f819-44b0-a5cf-9584ac3221d7', 'Decyl Glucoside', 'Decyl Polyglucose'),
  ('04a909fb-268f-4725-b35e-1ba7d0165952', 'Cyclohexasiloxane', 'Cyclomethicone D6'),
  ('193f0074-15d2-4dbc-9694-8c910a25bb24', 'Polyquaternium-37', 'PQ-37'),
  ('6cbc3f77-db9c-4245-bdae-eb47ea92804f', 'Acrylates Copolymer', 'Acrylic Polymer'),
  ('be90b741-91f6-4b1f-bf7b-d30c2398e9f0', 'Phenoxyethanol', 'Phenoxetol'),
  ('9f9fedd6-47b9-4c44-8572-b69f052599b0', 'Citric Acid', 'Sour Salt'),
  ('a3066146-fd4e-499d-a6d2-d3ca835b30f1', 'Tetrasodium EDTA', 'EDTA'),
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'Parfum', 'Fragrance'),
  ('396a37f3-4863-4771-8929-c204b2720c56', 'Mangifera Indica Seed Butter', 'Mango Butter'),
  ('cd34cdbc-55cd-47ee-a0f0-a2804c628a2c', 'Theobroma Cacao Seed Butter', 'Cocoa Butter');

insert into compatibility_scores (ingredient_id, porosity, scalp_condition, score, rating, reason) values
  -- Honey: good for all (natural humectant)
  ('7049b76d-c2d8-46bb-b4d3-fd89b8fe8536', 'low', null, 8, 'good', 'Natural humectant that hydrates without the stickiness risk of glycerin.'),
  ('7049b76d-c2d8-46bb-b4d3-fd89b8fe8536', 'medium', null, 8, 'good', 'Balanced humectant and emollient properties.'),
  ('7049b76d-c2d8-46bb-b4d3-fd89b8fe8536', 'high', null, 8, 'good', 'Helps draw and hold moisture in gappy, high porosity cuticles.'),

  -- Propanediol: good for low to medium porosity (lighter than glycerin)
  ('6d7802e7-bfaf-4434-b47d-bc9182013461', 'low', null, 8, 'good', 'Lighter humectant than glycerin; less likely to feel heavy or sticky on tight cuticles.'),
  ('6d7802e7-bfaf-4434-b47d-bc9182013461', 'medium', null, 7, 'good', 'Adds moisture with low buildup risk.'),
  ('6d7802e7-bfaf-4434-b47d-bc9182013461', 'high', null, 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),

  -- Jojoba Oil: good for all (closely mimics sebum)
  ('1b4e9af7-d9a0-4a64-a755-0063d75b5316', 'low', null, 9, 'good', 'Closely mimics natural sebum, absorbing well without heaviness.'),
  ('1b4e9af7-d9a0-4a64-a755-0063d75b5316', 'medium', null, 9, 'good', 'Balances moisture without buildup across most hair types.'),
  ('1b4e9af7-d9a0-4a64-a755-0063d75b5316', 'high', null, 9, 'good', 'Sebum-like profile helps condition gappy, high porosity cuticles.'),

  -- Argan Oil: good for medium to high porosity
  ('99c075f0-27be-428f-8c8e-31e42e67fc80', 'low', null, 5, 'neutral', 'Moderate-weight oil; workable but not the lightest option for tight cuticles.'),
  ('99c075f0-27be-428f-8c8e-31e42e67fc80', 'medium', null, 8, 'good', 'Balanced fatty acid profile conditions well without heaviness.'),
  ('99c075f0-27be-428f-8c8e-31e42e67fc80', 'high', null, 8, 'good', 'Helps smooth and condition damaged, gappy cuticles.'),

  -- Grapeseed Oil: good for low to medium porosity (lightweight)
  ('48e620fd-97bd-49cc-9095-93c5bbf0f4bf', 'low', null, 8, 'good', 'Lightweight oil absorbs easily without overwhelming tight cuticles.'),
  ('48e620fd-97bd-49cc-9095-93c5bbf0f4bf', 'medium', null, 8, 'good', 'Light, fast-absorbing conditioning with low buildup risk.'),
  ('48e620fd-97bd-49cc-9095-93c5bbf0f4bf', 'high', null, 5, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),

  -- Avocado Oil: good for high porosity
  ('730e3bd5-8be2-4362-9c5e-c04898e54bfb', 'low', null, 3, 'caution', 'Heavier, deeply penetrating oil can be too rich for tight cuticles.'),
  ('730e3bd5-8be2-4362-9c5e-c04898e54bfb', 'medium', null, 5, 'neutral', 'Workable in moderation; can feel heavy if overused.'),
  ('730e3bd5-8be2-4362-9c5e-c04898e54bfb', 'high', null, 8, 'good', 'Rich, penetrating oil conditions well in gappy, high porosity cuticles.'),

  -- Olive Oil: caution for low porosity (heavy), good for high porosity
  ('e7539979-3f21-4967-9b87-f88f25638a81', 'low', null, 3, 'caution', 'Heavy oil can sit on tight cuticles and cause buildup without absorbing.'),
  ('e7539979-3f21-4967-9b87-f88f25638a81', 'medium', null, 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('e7539979-3f21-4967-9b87-f88f25638a81', 'high', null, 8, 'good', 'Rich oil helps seal moisture into gappy, high porosity cuticles.'),

  -- Sunflower Seed Oil: good for low to medium porosity
  ('0baa13d6-978e-44b6-affc-19c5c08f3867', 'low', null, 8, 'good', 'Lightweight oil absorbs easily without overwhelming tight cuticles.'),
  ('0baa13d6-978e-44b6-affc-19c5c08f3867', 'medium', null, 8, 'good', 'Light conditioning with low buildup risk.'),
  ('0baa13d6-978e-44b6-affc-19c5c08f3867', 'high', null, 5, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),

  -- Jamaican Black Castor Oil: good for all (sealing)
  ('3a6a17df-2a15-4a05-b4fd-168c4294d044', 'low', null, 8, 'good', 'Effective sealant that locks in moisture without deeply penetrating tight cuticles.'),
  ('3a6a17df-2a15-4a05-b4fd-168c4294d044', 'medium', null, 8, 'good', 'Seals moisture effectively across most hair types.'),
  ('3a6a17df-2a15-4a05-b4fd-168c4294d044', 'high', null, 8, 'good', 'Helps compensate for gappy cuticles by sealing in moisture.'),

  -- Flaxseed Oil: good for all
  ('01446258-a4b5-40fe-b8d7-c9e6a5f41ff9', 'low', null, 8, 'good', 'Omega-rich oil absorbs well and supports shine without heaviness.'),
  ('01446258-a4b5-40fe-b8d7-c9e6a5f41ff9', 'medium', null, 8, 'good', 'Conditions and adds shine across most hair types.'),
  ('01446258-a4b5-40fe-b8d7-c9e6a5f41ff9', 'high', null, 8, 'good', 'Helps seal and smooth gappy, high porosity cuticles.'),

  -- Hydrolyzed Keratin: caution for low porosity, good for high porosity
  ('cb51ba16-1e28-4b03-a7cc-59c0ebf305a2', 'low', null, 3, 'caution', 'Protein can build up on tight cuticles and cause stiffness or breakage (protein overload).'),
  ('cb51ba16-1e28-4b03-a7cc-59c0ebf305a2', 'medium', null, 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.'),
  ('cb51ba16-1e28-4b03-a7cc-59c0ebf305a2', 'high', null, 8, 'good', 'Helps temporarily fill gaps in damaged, gappy cuticles and strengthen the strand.'),

  -- Silk Amino Acids: good for low to medium porosity (lightweight protein)
  ('eb2c70f9-ea79-4194-8df5-17aaff7c8f2d', 'low', null, 8, 'good', 'Lightweight protein conditions without the stiffness risk of heavier proteins.'),
  ('eb2c70f9-ea79-4194-8df5-17aaff7c8f2d', 'medium', null, 8, 'good', 'Adds softness and shine with minimal buildup risk.'),
  ('eb2c70f9-ea79-4194-8df5-17aaff7c8f2d', 'high', null, 5, 'neutral', 'Lightweight protein offers less gap-filling power than heavier proteins on damaged, high porosity cuticles.'),

  -- Quinoa Protein: good for medium to high porosity
  ('76d9e4d1-261e-460a-83a3-efa810b6a878', 'low', null, 3, 'caution', 'Protein can build up on tight cuticles and cause stiffness or breakage (protein overload).'),
  ('76d9e4d1-261e-460a-83a3-efa810b6a878', 'medium', null, 8, 'good', 'Strengthens and smooths without overloading the strand.'),
  ('76d9e4d1-261e-460a-83a3-efa810b6a878', 'high', null, 8, 'good', 'Helps fill gaps in damaged, gappy cuticles and strengthen the strand.'),

  -- Sodium Lauryl Sulfate: caution for all (harsh, strips moisture)
  ('790dcb5b-88b8-4403-9090-bcc73577dc93', 'low', null, 2, 'caution', 'Harsh sulfate strips natural oils and moisture; especially drying on already-resistant tight cuticles.'),
  ('790dcb5b-88b8-4403-9090-bcc73577dc93', 'medium', null, 2, 'caution', 'Harsh sulfate strips natural oils and moisture.'),
  ('790dcb5b-88b8-4403-9090-bcc73577dc93', 'high', null, 2, 'caution', 'Harsh sulfate strips moisture, compounding dryness in already-porous strands.'),

  -- Sodium Laureth Sulfate: caution for low porosity, neutral for high
  ('a126fd6d-fe4b-4072-97f2-70bfdb993925', 'low', null, 4, 'caution', 'Milder than SLS but can still strip moisture from tight, resistant cuticles.'),
  ('a126fd6d-fe4b-4072-97f2-70bfdb993925', 'medium', null, 5, 'neutral', 'Moderate cleansing strength; generally tolerated.'),
  ('a126fd6d-fe4b-4072-97f2-70bfdb993925', 'high', null, 6, 'neutral', 'Better tolerated on already-porous strands, though can still dry with frequent use.'),

  -- Cocamidopropyl Betaine: good for all (gentle cleanser)
  ('2fa4c00a-fa72-4fe0-a9eb-cbef500a0619', 'low', null, 8, 'good', 'Gentle, sulfate-free cleansing without stripping moisture.'),
  ('2fa4c00a-fa72-4fe0-a9eb-cbef500a0619', 'medium', null, 8, 'good', 'Mild cleanser well tolerated across hair types.'),
  ('2fa4c00a-fa72-4fe0-a9eb-cbef500a0619', 'high', null, 8, 'good', 'Cleans gently without exacerbating dryness in gappy cuticles.'),

  -- Decyl Glucoside: good for all (gentle, sulfate-free)
  ('a5743f71-f819-44b0-a5cf-9584ac3221d7', 'low', null, 8, 'good', 'Gentle, sulfate-free cleansing without stripping moisture.'),
  ('a5743f71-f819-44b0-a5cf-9584ac3221d7', 'medium', null, 8, 'good', 'Mild cleanser well tolerated across hair types.'),
  ('a5743f71-f819-44b0-a5cf-9584ac3221d7', 'high', null, 8, 'good', 'Cleans gently without exacerbating dryness in gappy cuticles.'),

  -- Cyclohexasiloxane: caution for low porosity
  ('04a909fb-268f-4725-b35e-1ba7d0165952', 'low', null, 3, 'caution', 'Volatile silicone can still contribute to buildup on tight cuticles over time.'),
  ('04a909fb-268f-4725-b35e-1ba7d0165952', 'medium', null, 5, 'neutral', 'Evaporates largely on its own; moderate buildup risk.'),
  ('04a909fb-268f-4725-b35e-1ba7d0165952', 'high', null, 6, 'neutral', 'Lightweight slip with low residue on open, high porosity cuticles.'),

  -- Polyquaternium-37: caution for low porosity (can build up)
  ('193f0074-15d2-4dbc-9694-8c910a25bb24', 'low', null, 3, 'caution', 'Cationic film-former can build up on tight cuticles without clarifying washes.'),
  ('193f0074-15d2-4dbc-9694-8c910a25bb24', 'medium', null, 5, 'neutral', 'Moderate buildup risk; manageable with regular clarifying.'),
  ('193f0074-15d2-4dbc-9694-8c910a25bb24', 'high', null, 6, 'neutral', 'Open cuticles shed buildup more easily.'),

  -- Acrylates Copolymer: caution for all (can flake like PVP)
  ('6cbc3f77-db9c-4245-bdae-eb47ea92804f', 'low', null, 4, 'caution', 'Film-forming polymer can flake and is hard to rinse from tight cuticles.'),
  ('6cbc3f77-db9c-4245-bdae-eb47ea92804f', 'medium', null, 4, 'caution', 'Can flake, especially with humidity or buildup.'),
  ('6cbc3f77-db9c-4245-bdae-eb47ea92804f', 'high', null, 4, 'caution', 'Flaking risk remains regardless of porosity.'),

  -- Phenoxyethanol: neutral for all (standard safe preservative)
  ('be90b741-91f6-4b1f-bf7b-d30c2398e9f0', 'low', null, 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('be90b741-91f6-4b1f-bf7b-d30c2398e9f0', 'medium', null, 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),
  ('be90b741-91f6-4b1f-bf7b-d30c2398e9f0', 'high', null, 5, 'neutral', 'Standard preservative with no notable direct effect on hair.'),

  -- Citric Acid: neutral for all (pH adjuster)
  ('9f9fedd6-47b9-4c44-8572-b69f052599b0', 'low', null, 5, 'neutral', 'pH adjuster; can help close the cuticle slightly but has no major porosity-specific effect.'),
  ('9f9fedd6-47b9-4c44-8572-b69f052599b0', 'medium', null, 5, 'neutral', 'pH adjuster with minimal direct conditioning effect.'),
  ('9f9fedd6-47b9-4c44-8572-b69f052599b0', 'high', null, 5, 'neutral', 'pH adjuster with minimal direct conditioning effect.'),

  -- Tetrasodium EDTA: neutral for all (chelating agent)
  ('a3066146-fd4e-499d-a6d2-d3ca835b30f1', 'low', null, 5, 'neutral', 'Chelating agent that improves formula stability; no major direct effect on hair.'),
  ('a3066146-fd4e-499d-a6d2-d3ca835b30f1', 'medium', null, 5, 'neutral', 'Chelating agent with minimal direct conditioning effect.'),
  ('a3066146-fd4e-499d-a6d2-d3ca835b30f1', 'high', null, 5, 'neutral', 'Chelating agent with minimal direct conditioning effect.'),

  -- Fragrance/Parfum: neutral for all, with a downgrade for sensitive scalp
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'low', null, 5, 'neutral', 'No notable direct effect on the hair shaft itself.'),
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'medium', null, 5, 'neutral', 'No notable direct effect on the hair shaft itself.'),
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'high', null, 5, 'neutral', 'No notable direct effect on the hair shaft itself.'),
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'low', 'sensitive', 2, 'avoid', 'Fragrance is a common scalp irritant and allergen trigger for sensitive scalps.'),
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'medium', 'sensitive', 2, 'avoid', 'Fragrance is a common scalp irritant and allergen trigger for sensitive scalps.'),
  ('ff3645dc-c5b2-46e8-94b9-059cc93dfaa6', 'high', 'sensitive', 2, 'avoid', 'Fragrance is a common scalp irritant and allergen trigger for sensitive scalps.'),

  -- Mango Butter: good for medium to high porosity
  ('396a37f3-4863-4771-8929-c204b2720c56', 'low', null, 3, 'caution', 'Heavy butter can sit on tight cuticles and cause buildup without absorbing.'),
  ('396a37f3-4863-4771-8929-c204b2720c56', 'medium', null, 8, 'good', 'Conditions well without being overly heavy.'),
  ('396a37f3-4863-4771-8929-c204b2720c56', 'high', null, 8, 'good', 'Rich occlusive seals moisture well in gappy, high porosity cuticles.'),

  -- Cocoa Butter: caution for low porosity (very heavy), good for high porosity
  ('cd34cdbc-55cd-47ee-a0f0-a2804c628a2c', 'low', null, 2, 'caution', 'Very heavy butter readily causes buildup and weighs down tight, low porosity strands.'),
  ('cd34cdbc-55cd-47ee-a0f0-a2804c628a2c', 'medium', null, 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('cd34cdbc-55cd-47ee-a0f0-a2804c628a2c', 'high', null, 8, 'good', 'Rich occlusive seals moisture well in gappy, high porosity cuticles.');
