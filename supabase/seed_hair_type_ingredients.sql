-- Ingredients added to support hair types 1-3 (straight/wavy/curly).
-- compatibility_scores.hair_type is populated here for the first time --
-- it's always been null on every pre-existing row, so this doesn't affect
-- any type-4 (coily) scoring, which never filters on hair_type.
--
-- 5 of the originally-requested 19 ingredients already existed in the
-- table (Dimethicone, Cyclomethicone, Guar Hydroxypropyltrimonium
-- Chloride, Benzyl Alcohol, Stearamidopropyl Dimethylamine, Hydrolyzed
-- Vegetable Protein PG-Propyl Silanetriol -- six, not five, once
-- Cyclomethicone is included) and are intentionally excluded here to avoid
-- a duplicate-ingredient insert; their requested behavior is handled in
-- lib/compatibility.ts's runtime curl-type adjustment layer instead.

insert into ingredients (id, inci_name, common_name) values
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'Trimethylsilylamodimethicone', 'TMS Amodimethicone'),
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'PVP/VA Copolymer', 'PVP/VA Copolymer'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'Polyquaternium-11', 'Polyquaternium-11'),
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'Hydrolyzed Oat Protein', 'Oat Protein'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'Hydroxypropyl Guar', 'Hydroxypropyl Guar'),
  ('f5622bf6-c55c-4718-a897-3c7fd8cf3f7b', 'Sodium Polystyrene Sulfonate', 'Sodium Polystyrene Sulfonate'),
  ('e19fcb02-2530-4708-b3c6-aa87e37eca76', 'Dehydroacetic Acid', 'Dehydroacetic Acid'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'Cetrimonium Bromide', 'Cetrimonium Bromide'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'Polysilicone-15', 'Polysilicone-15'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'Bis-Aminopropyl Dimethicone', 'Bis-Aminopropyl Dimethicone'),
  ('7756fd53-3780-4c78-8ace-1e488d8efe59', 'Keratin Amino Acids', 'Keratin Amino Acids'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'Acetamidopropyl Trimonium Chloride', 'Acetamidopropyl Trimonium Chloride'),
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'Laurdimonium Hydroxypropyl Hydrolyzed Wheat Protein', 'Wheat Protein PG-Propyl (Cationic)'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'Polyquaternium-72', 'Polyquaternium-72')
on conflict do nothing;

insert into compatibility_scores (ingredient_id, porosity, hair_type, scalp_condition, score, rating, reason) values
  -- TMS Amodimethicone
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'low', 'straight', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'medium', 'straight', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'high', 'straight', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'low', 'wavy', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'medium', 'wavy', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'high', 'wavy', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'low', 'curly', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'medium', 'curly', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  ('4c44650f-5ef1-404a-bda0-c2328c5ad10d', 'high', 'curly', null, 8, 'good', 'Lightweight amino silicone smooths the cuticle and controls frizz without the buildup risk of heavier silicones.'),
  -- PVP/VA Copolymer
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'low', 'straight', null, 8, 'good', 'Flexible film-former gives hold without the flaking risk plain PVP carries on straight and wavy hair.'),
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'medium', 'straight', null, 8, 'good', 'Flexible film-former gives hold without the flaking risk plain PVP carries on straight and wavy hair.'),
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'high', 'straight', null, 8, 'good', 'Flexible film-former gives hold without the flaking risk plain PVP carries on straight and wavy hair.'),
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'low', 'wavy', null, 8, 'good', 'Flexible film-former gives hold without the flaking risk plain PVP carries on straight and wavy hair.'),
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'medium', 'wavy', null, 8, 'good', 'Flexible film-former gives hold without the flaking risk plain PVP carries on straight and wavy hair.'),
  ('e5aadd7a-e557-442c-a71d-2a24c47a722f', 'high', 'wavy', null, 8, 'good', 'Flexible film-former gives hold without the flaking risk plain PVP carries on straight and wavy hair.'),
  -- Polyquaternium-11
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'low', 'straight', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'medium', 'straight', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'high', 'straight', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'low', 'wavy', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'medium', 'wavy', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'high', 'wavy', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'low', 'curly', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'medium', 'curly', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  ('cc6bd538-0bb0-4886-b2f0-0d337ae21c72', 'high', 'curly', null, 8, 'good', 'Lightweight conditioning polymer adds volume and body without weighing down the hair.'),
  -- Oat Protein
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'low', 'straight', null, 8, 'good', 'Lightweight protein adds body and fullness to fine hair without the stiffness risk of heavier proteins.'),
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'medium', 'straight', null, 8, 'good', 'Lightweight protein adds body and fullness to fine hair without the stiffness risk of heavier proteins.'),
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'high', 'straight', null, 8, 'good', 'Lightweight protein adds body and fullness to fine hair without the stiffness risk of heavier proteins.'),
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'low', 'wavy', null, 8, 'good', 'Lightweight protein adds body and fullness to fine hair without the stiffness risk of heavier proteins.'),
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'medium', 'wavy', null, 8, 'good', 'Lightweight protein adds body and fullness to fine hair without the stiffness risk of heavier proteins.'),
  ('578b45cc-00f9-4aed-b1b5-9070062ed876', 'high', 'wavy', null, 8, 'good', 'Lightweight protein adds body and fullness to fine hair without the stiffness risk of heavier proteins.'),
  -- Hydroxypropyl Guar
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'low', 'straight', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'medium', 'straight', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'high', 'straight', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'low', 'wavy', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'medium', 'wavy', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'high', 'wavy', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'low', 'curly', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'medium', 'curly', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  ('38db3064-5718-4728-b9a0-9cc4bb276671', 'high', 'curly', null, 8, 'good', 'Lightweight conditioning gum adds hold and enhances texture without heavy buildup.'),
  -- Sodium Polystyrene Sulfonate
  ('f5622bf6-c55c-4718-a897-3c7fd8cf3f7b', 'low', null, null, 6, 'neutral', 'Chelating agent that helps manage mineral buildup; no notable direct effect on hair texture.'),
  ('f5622bf6-c55c-4718-a897-3c7fd8cf3f7b', 'medium', null, null, 6, 'neutral', 'Chelating agent that helps manage mineral buildup; no notable direct effect on hair texture.'),
  ('f5622bf6-c55c-4718-a897-3c7fd8cf3f7b', 'high', null, null, 6, 'neutral', 'Chelating agent that helps manage mineral buildup; no notable direct effect on hair texture.'),
  -- Dehydroacetic Acid
  ('e19fcb02-2530-4708-b3c6-aa87e37eca76', 'low', null, null, 6, 'neutral', 'Mild preservative with no notable direct effect on hair.'),
  ('e19fcb02-2530-4708-b3c6-aa87e37eca76', 'medium', null, null, 6, 'neutral', 'Mild preservative with no notable direct effect on hair.'),
  ('e19fcb02-2530-4708-b3c6-aa87e37eca76', 'high', null, null, 6, 'neutral', 'Mild preservative with no notable direct effect on hair.'),
  -- Cetrimonium Bromide
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'low', 'straight', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'medium', 'straight', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'high', 'straight', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'low', 'wavy', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'medium', 'wavy', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'high', 'wavy', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'low', 'curly', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'medium', 'curly', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'high', 'curly', null, 8, 'good', 'Detangles and adds shine without the buildup or breakage risk heavier cationic surfactants carry.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'low', 'coily', null, 6, 'neutral', 'Detangles well; no particular advantage over other cationic conditioning agents already suited to coily hair.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'medium', 'coily', null, 6, 'neutral', 'Detangles well; no particular advantage over other cationic conditioning agents already suited to coily hair.'),
  ('2e2eaa05-e21d-47c5-8804-6dab48383087', 'high', 'coily', null, 6, 'neutral', 'Detangles well; no particular advantage over other cationic conditioning agents already suited to coily hair.'),
  -- Polysilicone-15
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'low', 'straight', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'medium', 'straight', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'high', 'straight', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'low', 'wavy', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'medium', 'wavy', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'high', 'wavy', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'low', 'curly', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'medium', 'curly', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  ('51a0490f-bb3a-497d-9ab0-7931770a999e', 'high', 'curly', null, 8, 'good', 'Lightweight silicone offers UV protection without the heaviness or buildup risk of traditional silicones.'),
  -- Bis-Aminopropyl Dimethicone
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'low', 'straight', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'medium', 'straight', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'high', 'straight', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'low', 'wavy', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'medium', 'wavy', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'high', 'wavy', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'low', 'curly', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'medium', 'curly', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  ('719b37d2-ca45-40fa-a00d-82b8da55aeb6', 'high', 'curly', null, 8, 'good', 'Lightweight, damage-repairing silicone conditions without the buildup risk of heavier formulas.'),
  -- Keratin Amino Acids
  ('7756fd53-3780-4c78-8ace-1e488d8efe59', 'low', null, null, 8, 'good', 'Small-molecule keratin derivatives reinforce the hair shaft without the buildup risk of larger protein molecules.'),
  ('7756fd53-3780-4c78-8ace-1e488d8efe59', 'medium', null, null, 8, 'good', 'Small-molecule keratin derivatives reinforce the hair shaft without the buildup risk of larger protein molecules.'),
  ('7756fd53-3780-4c78-8ace-1e488d8efe59', 'high', null, null, 8, 'good', 'Small-molecule keratin derivatives reinforce the hair shaft without the buildup risk of larger protein molecules.'),
  -- Acetamidopropyl Trimonium Chloride
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'low', 'straight', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'medium', 'straight', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'high', 'straight', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'low', 'wavy', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'medium', 'wavy', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'high', 'wavy', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'low', 'curly', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'medium', 'curly', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  ('deadaa53-8019-49fa-8b41-fe09e8b980f2', 'high', 'curly', null, 8, 'good', 'Cationic conditioning agent smooths the cuticle and controls frizz without heaviness.'),
  -- Wheat Protein PG-Propyl (Cationic)
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'low', 'straight', null, 8, 'good', 'Cationic wheat protein adds volume to fine hair without weighing it down.'),
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'medium', 'straight', null, 8, 'good', 'Cationic wheat protein adds volume to fine hair without weighing it down.'),
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'high', 'straight', null, 8, 'good', 'Cationic wheat protein adds volume to fine hair without weighing it down.'),
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'low', 'wavy', null, 8, 'good', 'Cationic wheat protein adds volume to fine hair without weighing it down.'),
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'medium', 'wavy', null, 8, 'good', 'Cationic wheat protein adds volume to fine hair without weighing it down.'),
  ('1fee00e0-a6fb-4e61-b2f5-8b570661df08', 'high', 'wavy', null, 8, 'good', 'Cationic wheat protein adds volume to fine hair without weighing it down.'),
  -- Polyquaternium-72
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'low', 'straight', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'medium', 'straight', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'high', 'straight', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'low', 'wavy', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'medium', 'wavy', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'high', 'wavy', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'low', 'curly', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'medium', 'curly', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.'),
  ('6e932367-b9c4-4509-af39-d5658fb179bb', 'high', 'curly', null, 8, 'good', 'Lightweight conditioning film reduces frizz without buildup.')
on conflict do nothing;
