-- Adds compatibility_scores rows (and ingredients.primary_function/
-- secondary_function tags) for the highest-frequency previously-unscored
-- ingredients identified by the coverage audit (226/852 = 26.5% scored).
--
-- No raw-SQL execution path exists for this project (no CLI link, no direct
-- Postgres connection string, no exec-sql RPC) - this file is a documentation
-- record of exactly what was applied. The actual writes ran via the
-- Supabase JS client (service role), doing a SELECT-then-insert-missing-rows
-- pass per item (equivalent to ON CONFLICT DO NOTHING, since the target
-- unique constraint shape on compatibility_scores wasn't confirmed) and an
-- UPDATE ... WHERE primary_function IS NULL pass per item, matching this SQL
-- statement-for-statement.
--
-- Corrections applied vs. the original request:
--  - compatibility_scores has no `notes` column - the real column is
--    `reason` (confirmed against a live row, which also has climate_modifier/
--    climate_notes columns not used here).
--  - Arginine is NOT tagged primary_function='protein'. It's a free amino
--    acid, not a hydrolyzed-protein polymer - tagging it 'protein' would
--    make it trigger the same low-porosity protein-buildup penalty and the
--    protein/bond-builder whole-product interaction checks (see
--    lib/compatibility.ts) as an actual protein ingredient, which
--    overstates a real but much weaker effect. secondary_function=
--    'scalp_active' is kept (topical arginine/scalp-circulation claims are
--    reasonably well supported).
--  - The original item 9 UPDATE referenced an undefined `i.` alias inside a
--    plain `UPDATE ingredients` statement (`... OR i.inci_name ILIKE
--    'isohexadecane'`) - would have raised "missing FROM-clause entry for
--    table i". Fixed to bare `inci_name`.
--  - The fragrance scalp_condition CROSS JOIN is trimmed from 5 values
--    (null, sensitive, oily, dry, normal) to 2 (null, sensitive) - the other
--    three would have scored identically to the null baseline (pure
--    duplication), and this matches the row shape already used by the
--    existing Parfum/DMDM Hydantoin rows in this table (generic + a
--    sensitive-scalp override only).
--  - Every UPDATE is guarded with `WHERE primary_function IS NULL` (or
--    secondary_function IS NULL) for idempotency, even though every target
--    ingredient's function columns were confirmed null before this ran.
--
-- RESULT: 147 new compatibility_scores rows, 46 ingredient function-tag
-- updates, but only 4 ingredients moved from zero rows to at least one row
-- (Aqua, Ceramide NP, Ceramide EOP, Ceramide AP - Phytosphingosine and
-- *Ceramide NS already had partial rows). Coverage moved 226/852 (26.5%)
-- -> 230/852 (27.0%), NOT toward 50% - most of the fragrance-chemical and
-- pH-adjuster names in the original request were already scored (they just
-- gained the missing sensitive-scalp row / porosity granularity). Reaching
-- 50% requires scoring ~200 more genuinely-unscored ingredients, most of
-- which are low-frequency label items, not concentrated in a short list.

-- 1. Water / Aqua (363 catalog occurrences) - "water" and "eau" as literal
-- exact ingredient names were not found (only "Aqua" exists as its own row;
-- the "Eau)" entry from the coverage audit is a mis-parsed label fragment,
-- not a real standalone ingredient - left unmatched rather than guessed at).
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity, 7, 'good',
  'Universal solvent and carrier. No direct conditioning effect but essential vehicle for all water-soluble actives.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE 'aqua'
ON CONFLICT DO NOTHING;

-- 2. Fragrance components - generic neutral row + sensitive-scalp caution
-- override, matching the existing Parfum/DMDM Hydantoin row shape.
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, scalp_condition, reason)
SELECT i.id, p.porosity, 5, 'neutral', NULL,
  'Fragrance component. Neutral for most profiles.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY[
  'polycitronellol', 'hydroxycitronellal', 'geraniol', 'linalyl acetate',
  'tetramethyl acetyloctahydronaphthalenes', 'limonene', 'linalool',
  'eugenol', 'benzyl salicylate', 'citral', 'coumarin', 'hexyl cinnamal',
  'alpha-isomethyl ionone', 'butylphenyl methylpropional',
  'cinnamyl alcohol', 'amyl cinnamal', 'anise alcohol', 'benzyl alcohol'
  -- not found in ingredients table: citronellol, farnesol, isoeugenol,
  -- benzyl benzoate, cinnamal, amylcinnamyl alcohol, benzyl cinnamate,
  -- methyl 2-octynoate, oak moss extract, tree moss extract
])
ON CONFLICT DO NOTHING;

INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, scalp_condition, reason)
SELECT i.id, p.porosity, 3, 'caution', 'sensitive',
  'Fragrance component. Caution for sensitive scalps - fragrance chemicals are a leading cause of contact dermatitis.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY[
  'polycitronellol', 'hydroxycitronellal', 'geraniol', 'linalyl acetate',
  'tetramethyl acetyloctahydronaphthalenes', 'limonene', 'linalool',
  'eugenol', 'benzyl salicylate', 'citral', 'coumarin', 'hexyl cinnamal',
  'alpha-isomethyl ionone', 'butylphenyl methylpropional',
  'cinnamyl alcohol', 'amyl cinnamal', 'anise alcohol', 'benzyl alcohol'
])
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY[
  'polycitronellol', 'hydroxycitronellal', 'geraniol', 'linalyl acetate',
  'tetramethyl acetyloctahydronaphthalenes', 'limonene', 'linalool',
  'eugenol', 'benzyl salicylate', 'citral', 'coumarin', 'hexyl cinnamal',
  'alpha-isomethyl ionone', 'butylphenyl methylpropional',
  'cinnamyl alcohol', 'amyl cinnamal', 'anise alcohol', 'benzyl alcohol'
]);

-- 3. Caprylic/Capric Triglyceride (35 occurrences)
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  CASE p.porosity WHEN 'low' THEN 8 WHEN 'medium' THEN 8 WHEN 'high' THEN 7 END,
  'good',
  'Lightweight ester oil. Excellent slip and emolliency without heaviness. One of the best carrier oils for fine and low porosity hair.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE '%caprylic%capric%triglyceride%'
  -- not found: coco-caprylate, fractionated coconut oil (as literal names)
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND inci_name ILIKE '%caprylic%capric%triglyceride%';

-- 4. Ceramides (24+ occurrences) - matched Ceramide NP/AP/EOP,
-- Phytosphingosine, and "* Ceramide NS" (the DB's real row has a leading
-- asterisk, so a bare 'ceramide ns' exact match wouldn't have found it -
-- the wildcard below catches it, same as the tagging UPDATE already used).
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  CASE p.porosity WHEN 'low' THEN 7 WHEN 'medium' THEN 8 WHEN 'high' THEN 9 END,
  'good',
  'Ceramide - fills gaps in the hair cuticle and reduces moisture loss. Particularly valuable for high porosity, color-treated, heat-damaged, or aging hair.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE '%ceramide%' OR i.inci_name ILIKE 'phytosphingosine'
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (inci_name ILIKE '%ceramide%' OR inci_name ILIKE 'phytosphingosine');

-- 5. Arginine (27 occurrences) - see header note on why primary_function is
-- NOT set to 'protein' here.
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  CASE p.porosity WHEN 'low' THEN 7 WHEN 'medium' THEN 8 WHEN 'high' THEN 8 END,
  'good',
  'Amino acid that supports hair shaft structure and scalp microcirculation. Less aggressive than hydrolyzed proteins - suitable for low porosity hair unlike heavy protein treatments.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE 'arginine'
ON CONFLICT DO NOTHING;

UPDATE ingredients SET secondary_function = 'scalp_active'
WHERE secondary_function IS NULL AND inci_name ILIKE 'arginine';

-- 6. Methylchloroisothiazolinone / Methylisothiazolinone (27+22 occurrences)
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity, 3, 'caution',
  'Preservative. Known skin and scalp sensitizer. Banned in leave-on products in the EU. Acceptable in rinse-off formulas at low concentrations but associated with contact dermatitis.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY['methylchloroisothiazolinone', 'methylisothiazolinone'])
ON CONFLICT DO NOTHING;

INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, scalp_condition, reason)
SELECT i.id, p.porosity, 1, 'avoid', 'sensitive',
  'Known sensitizer. Should be avoided on sensitive or reactive scalps.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY['methylchloroisothiazolinone', 'methylisothiazolinone'])
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'preservative'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY['methylchloroisothiazolinone', 'methylisothiazolinone']);

-- 7. Dimethiconol (26 occurrences)
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  CASE p.porosity WHEN 'low' THEN 7 WHEN 'medium' THEN 6 WHEN 'high' THEN 5 END,
  CASE p.porosity WHEN 'high' THEN 'neutral' ELSE 'good' END,
  'Silicone polymer. Provides smoothing and frizz control. Heavier than Dimethicone - can cause buildup on coily/high-porosity hair with infrequent washing.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE 'dimethiconol'
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'occlusive', secondary_function = 'emollient'
WHERE primary_function IS NULL AND inci_name ILIKE 'dimethiconol';

-- 8. Maltodextrin (28 occurrences)
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity, 7, 'good',
  'Starch-derived film-former. Creates a light flexible hold film on the hair shaft. Water-soluble - rinses out easily without clarifying shampoo.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE 'maltodextrin'
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'film_former'
WHERE primary_function IS NULL AND inci_name ILIKE 'maltodextrin';

-- 9. Isododecane / Isohexadecane (16+ occurrences)
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  CASE p.porosity WHEN 'low' THEN 9 WHEN 'medium' THEN 8 WHEN 'high' THEN 6 END,
  CASE p.porosity WHEN 'high' THEN 'neutral' ELSE 'good' END,
  'Volatile hydrocarbon emollient. Evaporates completely after application - no buildup, no residue.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY['isododecane', 'isohexadecane'])
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'solvent', secondary_function = 'emollient'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY['isododecane', 'isohexadecane']);

-- 10. Common emollients/esters - only Isopropyl Myristate, Ethylhexyl
-- Palmitate, and Squalane were found under these exact names.
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  CASE p.porosity WHEN 'high' THEN 8 ELSE 7 END,
  'good',
  'Lightweight emollient ester. Improves slip and texture without heaviness.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY['isopropyl myristate', 'ethylhexyl palmitate', 'squalane'])
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY['isopropyl myristate', 'ethylhexyl palmitate', 'squalane']);

-- 11. Common thickeners/texture agents - 7 of the 9 named ingredients exist.
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity, 6, 'neutral',
  'Rheology modifier / thickener. Gives the product its texture and viscosity. No direct hair benefit or harm.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY[
  'xanthan gum', 'hydroxyethylcellulose', 'hydroxypropyl guar',
  'guar hydroxypropyltrimonium chloride', 'carbomer',
  'acrylates/c10-30 alkyl acrylate crosspolymer', 'polyacrylate crosspolymer-6'
])
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY[
  'xanthan gum', 'hydroxyethylcellulose', 'hydroxypropyl guar',
  'guar hydroxypropyltrimonium chloride', 'carbomer',
  'acrylates/c10-30 alkyl acrylate crosspolymer', 'polyacrylate crosspolymer-6'
]);

-- 12. Common pH adjusters - matched 5 of 7; ALL 5 already had full
-- compatibility_scores coverage at every porosity (they're already used
-- elsewhere in the scoring logic - see HIGH_PH_INGREDIENTS in
-- lib/compatibility.ts), so this insert is a documented no-op.
INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity, 7, 'good',
  'pH adjuster. Maintains the formula at the correct pH for hair (4.5-5.5). Necessary for product stability and cuticle health at trace amounts.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.inci_name ILIKE ANY(ARRAY[
  'sodium hydroxide', 'triethanolamine', 'aminomethyl propanol',
  'potassium hydroxide', 'lactic acid'
])
ON CONFLICT DO NOTHING;

UPDATE ingredients SET primary_function = 'ph_adjuster'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY[
  'sodium hydroxide', 'triethanolamine', 'aminomethyl propanol',
  'potassium hydroxide', 'lactic acid'
]);

-- Coverage check
SELECT
  COUNT(DISTINCT i.id) AS total_ingredients,
  COUNT(DISTINCT cs.ingredient_id) AS scored_ingredients,
  ROUND(COUNT(DISTINCT cs.ingredient_id)::numeric / COUNT(DISTINCT i.id) * 100, 1) AS coverage_pct
FROM ingredients i
LEFT JOIN compatibility_scores cs ON cs.ingredient_id = i.id;
