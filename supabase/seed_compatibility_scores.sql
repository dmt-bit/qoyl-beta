-- Switch rating vocabulary from green/amber/red to the hair-science flags
-- requested for ingredient-level ratings (the overall page badge still
-- uses green/amber/red, derived from the normalized 0-100 score).
alter table compatibility_scores drop constraint compatibility_scores_rating_check;
alter table compatibility_scores
  add constraint compatibility_scores_rating_check
  check (rating = any (array['good', 'neutral', 'caution', 'avoid']));

insert into ingredients (id, inci_name, common_name) values
  ('627bd300-a7a5-4c96-be80-2d6dbcb31623', 'Glycerin', 'Glycerine'),
  ('c45f5ed3-be7b-4cf9-b14d-fd8f26c0c99b', 'Propylene Glycol', '1,2-Propanediol'),
  ('05840462-b5cd-4134-b935-3f03061e8c4c', 'Dimethicone', 'Polydimethylsiloxane'),
  ('ccf648e2-4a57-4f83-89ea-858d156087de', 'Butyrospermum Parkii Butter', 'Shea Butter'),
  ('cab87e06-fbb6-40da-836b-f8cc52a0ce45', 'Cocos Nucifera Oil', 'Coconut Oil'),
  ('dde95bc6-c6f8-43d9-a9dc-67a015f325da', 'Ricinus Communis Seed Oil', 'Castor Oil'),
  ('6b5f8bdc-2aab-4b3b-9971-41dd0a7a150c', 'PVP', 'Polyvinylpyrrolidone'),
  ('4ff0cdc8-88a4-4f81-a232-bee33f3e25be', 'Behentrimonium Methosulfate', 'BTMS'),
  ('ab596d8b-e1de-4857-b772-c6552c4ef15b', 'Panthenol', 'Pro-Vitamin B5'),
  ('9f13079f-282e-4b43-81c9-091f111a49d9', 'Hydrolyzed Wheat Protein', 'Wheat Protein'),
  ('28217ac7-28d8-406f-b435-e9fb522f4788', 'Aloe Barbadensis Leaf Juice', 'Aloe Vera'),
  ('ff6c5524-b453-4f87-8edd-57d775cfc414', 'Cetyl Alcohol', 'Palmityl Alcohol');

insert into compatibility_scores (ingredient_id, porosity, score, rating, reason, climate_modifier, climate_notes) values
  -- Glycerin: humectant, behavior flips with climate
  ('627bd300-a7a5-4c96-be80-2d6dbcb31623', 'low', 3, 'caution', 'Low porosity cuticles resist humectants; glycerin can sit on the strand and feel sticky or, in dry air, pull moisture back out of the hair.', 'arid_downgrade', 'In dry/arid climates, glycerin can reverse-hygroscopically draw moisture out of low porosity strands, worsening dryness.'),
  ('627bd300-a7a5-4c96-be80-2d6dbcb31623', 'medium', 6, 'neutral', 'Generally tolerated; benefit depends on ambient humidity.', 'none', null),
  ('627bd300-a7a5-4c96-be80-2d6dbcb31623', 'high', 8, 'good', 'High porosity hair absorbs and holds the humectant moisture well.', 'humid_boost', 'Performs best in humid climates where ambient moisture supports glycerin''s humectant effect; less effective in dry climates.'),

  -- Propylene Glycol: caution across the board, worse for low porosity
  ('c45f5ed3-be7b-4cf9-b14d-fd8f26c0c99b', 'low', 3, 'caution', 'Small humectant molecule can over-penetrate already-tight cuticles and cause stiffness or dryness rebound.', 'none', null),
  ('c45f5ed3-be7b-4cf9-b14d-fd8f26c0c99b', 'medium', 4, 'caution', 'Can still cause dryness or irritation with frequent use.', 'none', null),
  ('c45f5ed3-be7b-4cf9-b14d-fd8f26c0c99b', 'high', 5, 'caution', 'Better tolerated than on lower porosity hair, but still a known irritant/drying agent for some.', 'none', null),

  -- Dimethicone: buildup risk inversely related to porosity
  ('05840462-b5cd-4134-b935-3f03061e8c4c', 'low', 3, 'caution', 'Tight cuticles make silicone buildup more likely without clarifying washes.', 'none', null),
  ('05840462-b5cd-4134-b935-3f03061e8c4c', 'medium', 5, 'neutral', 'Moderate buildup risk; manageable with regular clarifying.', 'none', null),
  ('05840462-b5cd-4134-b935-3f03061e8c4c', 'high', 7, 'neutral', 'Open cuticles shed buildup more easily; can also help fill porosity gaps temporarily.', 'none', null),

  -- Shea Butter: heavy occlusive, best for high porosity
  ('ccf648e2-4a57-4f83-89ea-858d156087de', 'low', 3, 'caution', 'Heavy butter can sit on low porosity strands and cause buildup without absorbing.', 'none', null),
  ('ccf648e2-4a57-4f83-89ea-858d156087de', 'medium', 5, 'neutral', 'Workable in small amounts; can be heavy if overused.', 'none', null),
  ('ccf648e2-4a57-4f83-89ea-858d156087de', 'high', 8, 'good', 'Rich occlusive seals moisture well in gappy, high porosity cuticles.', 'none', null),

  -- Coconut Oil: good for low-medium, neutral for high
  ('cab87e06-fbb6-40da-836b-f8cc52a0ce45', 'low', 8, 'good', 'Penetrates the shaft well and reduces protein loss on tighter cuticles.', 'none', null),
  ('cab87e06-fbb6-40da-836b-f8cc52a0ce45', 'medium', 7, 'good', 'Penetrates well and helps retain moisture.', 'none', null),
  ('cab87e06-fbb6-40da-836b-f8cc52a0ce45', 'high', 5, 'neutral', 'Still beneficial but less essential since high porosity hair already absorbs moisture readily; can feel heavy without a lighter follow-up.', 'none', null),

  -- Castor Oil: universally good sealing oil
  ('dde95bc6-c6f8-43d9-a9dc-67a015f325da', 'low', 8, 'good', 'Effective sealant that locks in moisture without deeply penetrating tight cuticles.', 'none', null),
  ('dde95bc6-c6f8-43d9-a9dc-67a015f325da', 'medium', 8, 'good', 'Seals moisture effectively across most hair types.', 'none', null),
  ('dde95bc6-c6f8-43d9-a9dc-67a015f325da', 'high', 8, 'good', 'Helps compensate for gappy cuticles by sealing in moisture.', 'none', null),

  -- PVP: film-forming fixative, flaking risk across the board
  ('6b5f8bdc-2aab-4b3b-9971-41dd0a7a150c', 'low', 4, 'caution', 'Film-forming polymer can flake and is hard to rinse from tight cuticles.', 'none', null),
  ('6b5f8bdc-2aab-4b3b-9971-41dd0a7a150c', 'medium', 4, 'caution', 'Can flake, especially with humidity or buildup.', 'none', null),
  ('6b5f8bdc-2aab-4b3b-9971-41dd0a7a150c', 'high', 4, 'caution', 'Flaking risk remains regardless of porosity.', 'none', null),

  -- Behentrimonium Methosulfate: gentle conditioning, good for all
  ('4ff0cdc8-88a4-4f81-a232-bee33f3e25be', 'low', 9, 'good', 'Mild cationic conditioner that detangles without heavy buildup.', 'none', null),
  ('4ff0cdc8-88a4-4f81-a232-bee33f3e25be', 'medium', 9, 'good', 'Gentle, well-tolerated conditioning agent.', 'none', null),
  ('4ff0cdc8-88a4-4f81-a232-bee33f3e25be', 'high', 9, 'good', 'Helps smooth gappy cuticles without weighing hair down.', 'none', null),

  -- Panthenol: lightweight humectant, especially good for low porosity
  ('ab596d8b-e1de-4857-b772-c6552c4ef15b', 'low', 9, 'good', 'Lightweight humectant that adds moisture without overwhelming tight cuticles.', 'none', null),
  ('ab596d8b-e1de-4857-b772-c6552c4ef15b', 'medium', 7, 'good', 'Adds moisture and mild strengthening with little risk of buildup.', 'none', null),
  ('ab596d8b-e1de-4857-b772-c6552c4ef15b', 'high', 6, 'neutral', 'Beneficial but evaporates quickly without a sealant on already-absorbent strands.', 'none', null),

  -- Hydrolyzed Wheat Protein: stiffness risk on low porosity, beneficial on high
  ('9f13079f-282e-4b43-81c9-091f111a49d9', 'low', 3, 'caution', 'Protein can build up on tight cuticles and cause stiffness or breakage (protein overload).', 'none', null),
  ('9f13079f-282e-4b43-81c9-091f111a49d9', 'medium', 5, 'neutral', 'Tolerated in moderation; watch for protein overload with frequent use.', 'none', null),
  ('9f13079f-282e-4b43-81c9-091f111a49d9', 'high', 8, 'good', 'Helps temporarily fill gaps in damaged, gappy cuticles and strengthen the strand.', 'none', null),

  -- Aloe Vera: gentle, broadly compatible
  ('28217ac7-28d8-406f-b435-e9fb522f4788', 'low', 8, 'good', 'Lightweight hydration that tight cuticles tolerate well.', 'none', null),
  ('28217ac7-28d8-406f-b435-e9fb522f4788', 'medium', 8, 'good', 'Gentle hydrating and soothing ingredient.', 'none', null),
  ('28217ac7-28d8-406f-b435-e9fb522f4788', 'high', 8, 'good', 'Hydrates without adding heavy buildup.', 'none', null),

  -- Cetyl Alcohol: lightweight fatty alcohol, good for all
  ('ff6c5524-b453-4f87-8edd-57d775cfc414', 'low', 8, 'good', 'Lightweight conditioning that doesn''t overwhelm tight cuticles.', 'none', null),
  ('ff6c5524-b453-4f87-8edd-57d775cfc414', 'medium', 8, 'good', 'Mild emollient with low buildup risk.', 'none', null),
  ('ff6c5524-b453-4f87-8edd-57d775cfc414', 'high', 8, 'good', 'Smooths cuticles without heaviness.', 'none', null);
