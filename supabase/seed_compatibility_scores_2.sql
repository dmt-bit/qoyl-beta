insert into ingredients (id, inci_name, common_name) values
  ('465aaf4c-502d-49b3-aec4-cae304cdb345', 'Chondrus Crispus Extract', 'Sea Moss Extract'),
  ('4878c7a7-89a6-4937-9efc-5447e73d8ffa', 'PEG-40 Hydrogenated Castor Oil', 'Cremophor RH40'),
  ('7c5a0860-fdd8-4da8-9095-2ded7a303403', 'Sorbitol', 'D-Sorbitol'),
  ('888cd7b9-09f3-4cfa-9827-c5ca15338836', 'Phytosterols', 'Plant Sterols'),
  ('244a96d3-3875-4a74-89f0-5ca7fe1a84a5', 'Betaine', 'Trimethylglycine'),
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'DMDM Hydantoin', 'Glydant'),
  ('c33dda8c-0542-4b60-a324-f22caf43ffd7', 'Lanolin Oil', 'Lanolin'),
  ('ed78fcf1-f5a9-4410-8e48-1d29ec8cc9e5', 'Hydrolyzed Collagen', 'Collagen Peptides'),
  ('b1c4ebdc-3eab-4d2e-82f5-12ab6befd4ba', 'Amodimethicone', 'Amino Silicone'),
  ('9645b25b-29a1-4178-8696-381857bc9b36', 'Cyclopentasiloxane', 'Cyclomethicone D5'),
  ('ff606f33-adc4-42fc-9656-114146b5aef0', 'Cyclomethicone', 'Cyclic Silicone'),
  ('04176f7a-6c97-4c58-bc54-3a4a39e1c63c', 'Isopropyl Myristate', 'IPM');

insert into compatibility_scores (ingredient_id, porosity, scalp_condition, score, rating, reason) values
  -- Sea Moss Extract: good for all (slip and moisture retention)
  ('465aaf4c-502d-49b3-aec4-cae304cdb345', 'low', null, 8, 'good', 'Provides slip and lightweight moisture retention without buildup.'),
  ('465aaf4c-502d-49b3-aec4-cae304cdb345', 'medium', null, 8, 'good', 'Polysaccharides aid slip and hydration across most hair types.'),
  ('465aaf4c-502d-49b3-aec4-cae304cdb345', 'high', null, 8, 'good', 'Helps retain moisture in gappy, high porosity cuticles.'),

  -- PEG-40 Hydrogenated Castor Oil: neutral for all (mild emulsifier)
  ('4878c7a7-89a6-4937-9efc-5447e73d8ffa', 'low', null, 5, 'neutral', 'Mild solubilizer/emulsifier with little direct conditioning effect.'),
  ('4878c7a7-89a6-4937-9efc-5447e73d8ffa', 'medium', null, 5, 'neutral', 'Functions mainly to blend oils into formulas; minimal porosity-specific impact.'),
  ('4878c7a7-89a6-4937-9efc-5447e73d8ffa', 'high', null, 5, 'neutral', 'Minimal direct effect on hair; primarily a formulation aid.'),

  -- Sorbitol: good for low porosity (lighter humectant than glycerin)
  ('7c5a0860-fdd8-4da8-9095-2ded7a303403', 'low', null, 8, 'good', 'Lighter humectant than glycerin; less likely to feel sticky or reverse-absorb moisture on tight cuticles.'),
  ('7c5a0860-fdd8-4da8-9095-2ded7a303403', 'medium', null, 7, 'good', 'Adds moisture with low buildup risk.'),
  ('7c5a0860-fdd8-4da8-9095-2ded7a303403', 'high', null, 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),

  -- Phytosterols: good for all (strengthens hair shaft)
  ('888cd7b9-09f3-4cfa-9827-c5ca15338836', 'low', null, 8, 'good', 'Helps reinforce the hair shaft without weighing down tight cuticles.'),
  ('888cd7b9-09f3-4cfa-9827-c5ca15338836', 'medium', null, 8, 'good', 'Supports shaft strength and elasticity.'),
  ('888cd7b9-09f3-4cfa-9827-c5ca15338836', 'high', null, 8, 'good', 'Reinforces structure in damaged, gappy cuticles.'),

  -- Betaine: good for low porosity (lightweight humectant)
  ('244a96d3-3875-4a74-89f0-5ca7fe1a84a5', 'low', null, 8, 'good', 'Lightweight humectant that hydrates without overwhelming tight cuticles.'),
  ('244a96d3-3875-4a74-89f0-5ca7fe1a84a5', 'medium', null, 7, 'good', 'Adds moisture with minimal buildup risk.'),
  ('244a96d3-3875-4a74-89f0-5ca7fe1a84a5', 'high', null, 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),

  -- DMDM Hydantoin: caution for all porosity, with a stronger downgrade for sensitive scalp
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'low', null, 4, 'caution', 'Formaldehyde-releasing preservative; can irritate and dry out hair/scalp with frequent exposure.'),
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'medium', null, 4, 'caution', 'Formaldehyde-releasing preservative; moderate irritation risk regardless of porosity.'),
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'high', null, 4, 'caution', 'Formaldehyde-releasing preservative; moderate irritation risk regardless of porosity.'),
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'low', 'sensitive', 2, 'avoid', 'Formaldehyde release poses a heightened irritation risk on sensitive scalps.'),
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'medium', 'sensitive', 2, 'avoid', 'Formaldehyde release poses a heightened irritation risk on sensitive scalps.'),
  ('8611a153-5106-4002-9b41-d53bbf29949b', 'high', 'sensitive', 2, 'avoid', 'Formaldehyde release poses a heightened irritation risk on sensitive scalps.'),

  -- Lanolin Oil: caution for low porosity (heavy occlusive), good for high porosity
  ('c33dda8c-0542-4b60-a324-f22caf43ffd7', 'low', null, 3, 'caution', 'Heavy occlusive oil can sit on tight cuticles and cause buildup without absorbing.'),
  ('c33dda8c-0542-4b60-a324-f22caf43ffd7', 'medium', null, 5, 'neutral', 'Workable in small amounts; can be heavy if overused.'),
  ('c33dda8c-0542-4b60-a324-f22caf43ffd7', 'high', null, 8, 'good', 'Rich occlusive helps seal moisture into gappy, high porosity cuticles.'),

  -- Hydrolyzed Collagen: caution for low porosity (protein overload risk), good for high porosity
  ('ed78fcf1-f5a9-4410-8e48-1d29ec8cc9e5', 'low', null, 3, 'caution', 'Protein can build up on tight cuticles and cause stiffness or breakage (protein overload).'),
  ('ed78fcf1-f5a9-4410-8e48-1d29ec8cc9e5', 'medium', null, 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.'),
  ('ed78fcf1-f5a9-4410-8e48-1d29ec8cc9e5', 'high', null, 8, 'good', 'Helps temporarily fill gaps in damaged, gappy cuticles and strengthen the strand.'),

  -- Amodimethicone: caution for low porosity (silicone buildup), good for high porosity (fills cuticle gaps)
  ('b1c4ebdc-3eab-4d2e-82f5-12ab6befd4ba', 'low', null, 3, 'caution', 'Amino-functional silicone can still build up on tight cuticles without clarifying washes.'),
  ('b1c4ebdc-3eab-4d2e-82f5-12ab6befd4ba', 'medium', null, 5, 'neutral', 'Moderate buildup risk; manageable with regular clarifying.'),
  ('b1c4ebdc-3eab-4d2e-82f5-12ab6befd4ba', 'high', null, 8, 'good', 'Binds well to damaged sites and helps fill gaps in gappy, high porosity cuticles.'),

  -- Cyclopentasiloxane: caution for low porosity, neutral for high porosity
  ('9645b25b-29a1-4178-8696-381857bc9b36', 'low', null, 3, 'caution', 'Volatile silicone can still contribute to buildup on tight cuticles over time.'),
  ('9645b25b-29a1-4178-8696-381857bc9b36', 'medium', null, 5, 'neutral', 'Evaporates largely on its own; moderate buildup risk.'),
  ('9645b25b-29a1-4178-8696-381857bc9b36', 'high', null, 6, 'neutral', 'Lightweight slip with low residue on open, high porosity cuticles.'),

  -- Cyclomethicone: caution for low porosity, neutral for high porosity
  ('ff606f33-adc4-42fc-9656-114146b5aef0', 'low', null, 3, 'caution', 'Volatile silicone can still contribute to buildup on tight cuticles over time.'),
  ('ff606f33-adc4-42fc-9656-114146b5aef0', 'medium', null, 5, 'neutral', 'Evaporates largely on its own; moderate buildup risk.'),
  ('ff606f33-adc4-42fc-9656-114146b5aef0', 'high', null, 6, 'neutral', 'Lightweight slip with low residue on open, high porosity cuticles.'),

  -- Isopropyl Myristate: neutral for all (lightweight emollient)
  ('04176f7a-6c97-4c58-bc54-3a4a39e1c63c', 'low', null, 5, 'neutral', 'Lightweight emollient with minimal buildup risk but limited conditioning benefit.'),
  ('04176f7a-6c97-4c58-bc54-3a4a39e1c63c', 'medium', null, 5, 'neutral', 'Adds slip and lightweight emolliency without strong porosity-specific benefit.'),
  ('04176f7a-6c97-4c58-bc54-3a4a39e1c63c', 'high', null, 5, 'neutral', 'Lightweight emollient; unremarkable but unlikely to cause issues.');
