-- Final targeted coverage push against the 245 remaining completely-
-- unscored ingredients (identified by the diagnostic query from the
-- previous turn), in 5 groups, followed by auto-scoring generation.
--
-- No raw-SQL execution path exists for this project - the actual writes
-- ran via the Supabase JS client (service role). This file documents what
-- was applied. FUNCTION_DEFAULT_SCORES already had colorant/amino_acid/
-- propellant/uv_filter/emulsifier from the previous turn - no code
-- changes were needed this time, this is a pure data pass.
--
-- 11 individual corrections were made after dry-running every pattern and
-- checking each match's real chemistry - most were cases where an
-- ingredient's own request grouped it by a coincidental property (having
-- an asterisk, containing a color word) rather than what it actually is,
-- and several had an exact or same-family ingredient ALREADY tagged
-- differently in an earlier turn, which is the strongest possible signal
-- for where the untagged one belongs:
--   - "* Hydroxyacetophenone" (a preservative-booster/deodorizing
--     phenolic, not an emollient) and "* Aspergillus Ferment" (a
--     fermentation-derived bioactive, not a fragrance component) were
--     grouped into their categories only because of a leading asterisk -
--     excluded. Aspergillus Ferment ends up correctly tagged scalp_active
--     anyway via a later, more accurate pattern in the same request.
--   - Tocopheryl Acetate -> antioxidant (not emollient) - it's the acetate
--     ester of Tocopherol, already tagged antioxidant.
--   - 2-Hexanediol and Isopentyldiol -> humectant (not emollient) - same
--     diol family as the already-tagged Butylene/Hexylene/Pentylene
--     Glycol.
--   - Ceresin -> occlusive (not emollient) - a wax like the already-
--     tagged beeswax/candelilla/carnauba, not an oil/ester.
--   - Vinegar (acetum) -> ph_adjuster (not antioxidant) - the same
--     substance as the already-tagged "Acetic Acid (apple Cider)".
--   - Fumaric Acid and Gluconodeltalactone -> ph_adjuster (not
--     antioxidant) - same acid/AHA family as Glycolic/Tartaric Acid and
--     the same compound as the already-tagged Gluconolactone
--     (Gluconodeltalactone is just an alternate spelling).
--   - Sucrose -> humectant (not scalp_active) - a classic humectant sugar
--     like the already-tagged Sorbitol/Trehalose.
--   - Lysine Hcl -> amino_acid (not ph_adjuster) - Lysine is literally one
--     of the 16 amino acids named in that category's own definition.

-- PASS 1 - essential oils -> fragrance (matches the app's existing
-- treatment of peppermint/tea tree/eucalyptus). Ran as specified, no
-- issues found.
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%cedarwood%oil%' OR inci_name ILIKE '%bergamot%oil%' OR
  inci_name ILIKE '%mandarin%oil%' OR inci_name ILIKE '%zingiber%oil%' OR
  inci_name ILIKE '%ginger%oil%' OR inci_name ILIKE '%ylang%oil%' OR
  inci_name ILIKE '%lavandin%oil%' OR inci_name ILIKE '%cardamom%oil%' OR
  inci_name ILIKE '%elettaria%oil%' OR inci_name ILIKE '%fir%oil%' OR
  inci_name ILIKE '%juniper%oil%' OR inci_name ILIKE '%nutmeg%oil%' OR
  inci_name ILIKE '%sandalwood%oil%' OR inci_name ILIKE '%santalum%oil%' OR
  inci_name ILIKE '%amyris%oil%' OR inci_name ILIKE '%galbanum%oil%' OR
  inci_name ILIKE '%ferula%oil%' OR inci_name ILIKE '%eucalyptus%oil%' OR
  inci_name ILIKE '%ocimum%' OR inci_name ILIKE '%camphor%' OR
  inci_name ILIKE '%benzaldehyde%' OR inci_name ILIKE '%rose ketone%' OR
  inci_name ILIKE '%alpha isomethyl ionone%' OR inci_name ILIKE '%trimethylbenzenepropanol%' OR
  inci_name ILIKE '%menthyl lactate%' OR inci_name ILIKE '%phenethyl benzoate%' OR
  inci_name ILIKE '%origanum%' OR inci_name ILIKE '%copaiferi%' OR
  inci_name ILIKE '%abies balsamea%' OR inci_name ILIKE '%cedarwood%'
);
-- -> 20 rows.

-- PASS 2 - typo/duplicate spellings
UPDATE ingredients SET primary_function = 'preservative'
WHERE primary_function IS NULL AND inci_name ILIKE 'ethylhexylglyerine%';
-- -> 1 row.
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND inci_name ILIKE 'cetearylalcohol%';
-- -> 1 row.
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND inci_name ILIKE 'hydoxyethycelluolose%';
-- -> 1 row.
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'coco caprylate/caprate%' OR
  inci_name ILIKE '* coco-caprylate%' OR
  inci_name ILIKE '* coco%caprylate%'
)
AND inci_name NOT ILIKE '%hydroxyacetophenone%';
-- -> 2 rows.
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '*zingiber%' OR inci_name ILIKE '*ylang%' OR
  inci_name ILIKE '*xylitylglucoside%' OR inci_name ILIKE '*charcoal%' OR
  inci_name ILIKE '*brassicyl%' OR inci_name ILIKE '*lavandin%' OR
  inci_name ILIKE '*cardamom%' OR inci_name ILIKE '*fir %' OR
  inci_name ILIKE '*juniper%' OR inci_name ILIKE '*nutmeg%' OR
  inci_name ILIKE '*sandalwood%' OR inci_name ILIKE '*menthyl%' OR
  inci_name ILIKE '*acyl%'
);
-- -> 1 row (most of these patterns assumed a leading asterisk that the
-- live data doesn't actually have on these specific entries - see the
-- previous turn's note on this; harmless, later/more-specific patterns in
-- this same run or an earlier turn already caught the real ones).
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND inci_name ILIKE '* ethylhexyl olivate%';
-- -> 1 row.

-- PASS 3 - surfactants and conditioning agents
UPDATE ingredients SET primary_function = 'surfactant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'coco-glucoside%' OR inci_name ILIKE 'coco glucoside%' OR
  inci_name ILIKE '%undeceth-%' OR inci_name ILIKE '%c12-13 alketh%' OR
  inci_name ILIKE '%c11-15 alketh%' OR inci_name ILIKE '%ceteth-%phosphate%' OR
  inci_name ILIKE '%dicetyl phosphate%' OR inci_name ILIKE 'tea-dodecylbenzenesulfonate%' OR
  inci_name ILIKE '%stearamine oxide%'
);
-- -> 9 rows.
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%stearalkonium chloride%' OR inci_name ILIKE '%distearyldimonium chloride%' OR
  inci_name ILIKE '%dimethyl stearamine%' OR inci_name ILIKE '%cocoglucosides hydroxypropyltrimonium%' OR
  inci_name ILIKE '%panthenyl hydroxypropyl steardimonium%' OR inci_name ILIKE '%brassicamidopropyl%' OR
  inci_name ILIKE '%brassicyl isoleucinate%' OR inci_name ILIKE 'stearamide amp%'
);
-- -> 7 rows.

-- PASS 4 - emollients and solubilizers (Tocopheryl Acetate/2-Hexanediol/
-- Isopentyldiol/Ceresin excluded here, see corrections at the bottom)
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'octyldodecanol%' OR inci_name ILIKE 'butyloctanol%' OR
  inci_name ILIKE 'octyldodecyl xyloside%' OR inci_name ILIKE '%isostearyl isostearate%' OR
  inci_name ILIKE 'xylityl sesquicaprylate%' OR inci_name ILIKE 'neopentyl glycol diheptanoate%' OR
  inci_name ILIKE 'xylitylglucoside%' OR inci_name ILIKE '%opuntia%oil%' OR
  inci_name ILIKE '%moroccan pear%' OR inci_name ILIKE 'cholesterol%' OR
  inci_name ILIKE 'phytantriol%' OR inci_name ILIKE '%phospholipid%' OR
  inci_name ILIKE 'undecane%' OR inci_name ILIKE 'tridecane%' OR
  inci_name ILIKE 'c13-16 isoparaffin%' OR inci_name ILIKE '%isoparaffin%' OR
  inci_name ILIKE 'polyester-11%' OR inci_name ILIKE 'polyester-37%' OR
  inci_name ILIKE '%glyereth-2 cocoate%' OR inci_name ILIKE '%polyglyceryl-3 diisostearate%' OR
  inci_name ILIKE '%c12-15 alkyl benzoate%' OR inci_name ILIKE 'ethyl oleate%'
)
AND inci_name NOT ILIKE '%tocopheryl acetate%'
AND inci_name NOT ILIKE '2-hexanediol%'
AND inci_name NOT ILIKE 'isopentyldiol%'
AND inci_name NOT ILIKE 'ceresin%';
-- -> 18 rows.

-- PASS 5 - antioxidants, actives, and miscellaneous (Vinegar/Fumaric
-- Acid/Gluconodeltalactone excluded from antioxidant, Sucrose excluded
-- from scalp_active, Lysine Hcl excluded from ph_adjuster - see
-- corrections below)
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'bht%' OR inci_name ILIKE 'tbhq%' OR
  inci_name ILIKE 'retinyl palmitate%' OR inci_name ILIKE 'beta-carotene%' OR
  inci_name ILIKE '%curcuma%' OR inci_name ILIKE '%turmeric%' OR
  inci_name ILIKE '%bisabolol%' OR inci_name ILIKE '%isoquercetin%'
);
-- -> 7 rows.
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%melatonin%' OR inci_name ILIKE '%royal jelly%' OR
  inci_name ILIKE '%ovum powder%' OR inci_name ILIKE '%pyridoxine%' OR
  inci_name ILIKE '%vitamin b6%' OR inci_name ILIKE '%acyl coenzyme%' OR
  inci_name ILIKE '%aspergillus ferment%' OR inci_name ILIKE '%yogurt%' OR
  inci_name ILIKE '%sarcosine%' OR inci_name ILIKE '%inulin%' OR
  inci_name ILIKE '%cyclodextrin%'
);
-- -> 10 rows.
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%zeolite%' OR inci_name ILIKE '%aluminum starch%' OR
  inci_name ILIKE '%charcoal%' OR inci_name ILIKE '%zinc chloride%'
);
-- -> 4 rows.
UPDATE ingredients SET primary_function = 'ph_adjuster'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%triisopropanolamine%' OR inci_name ILIKE '%magnesium nitrate%' OR
  inci_name ILIKE '%calcium gluconate%' OR inci_name ILIKE 'glyoxal%'
);
-- -> 4 rows.
UPDATE ingredients SET primary_function = 'humectant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%cyclodextrin%' OR inci_name ILIKE '%methyl gluceth%' OR
  inci_name ILIKE '%undeceth%' OR inci_name ILIKE '%phytantriol%'
);
-- -> 0 rows (all already claimed by earlier, more specific patterns in
-- this same run - Cyclodextrin/scalp_active, Methyl Gluceth already
-- tagged 2 turns ago, Undeceth/surfactant, Phytantriol/emollient).

-- Corrections (see notes above for why each moved)
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND inci_name ILIKE 'tocopheryl acetate%';
UPDATE ingredients SET primary_function = 'humectant'
WHERE primary_function IS NULL AND (inci_name ILIKE '2-hexanediol%' OR inci_name ILIKE 'isopentyldiol%');
UPDATE ingredients SET primary_function = 'occlusive'
WHERE primary_function IS NULL AND inci_name ILIKE 'ceresin%';
UPDATE ingredients SET primary_function = 'ph_adjuster'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%vinegar%' OR inci_name ILIKE '%acetum%' OR
  inci_name ILIKE '%fumaric acid%' OR inci_name ILIKE '%gluconodeltalactone%'
);
UPDATE ingredients SET primary_function = 'humectant'
WHERE primary_function IS NULL AND inci_name ILIKE 'sucrose%';
UPDATE ingredients SET primary_function = 'amino_acid'
WHERE primary_function IS NULL AND inci_name ILIKE 'lysine hcl%';
-- -> 1+2+1+3+1+1 = 9 rows.

-- Total this turn: 95 ingredients newly tagged.

-- Final function tag distribution (850 total ingredients):
--   still untagged: 185, antioxidant: 143, emollient: 112,
--   conditioning_agent: 50, fragrance: 49, emulsifier: 46,
--   scalp_active: 39, protein: 29, thickener: 28, surfactant: 28,
--   humectant: 25, occlusive: 23, film_former: 20, preservative: 17,
--   ph_adjuster: 16, amino_acid: 15, colorant: 10, chelating_agent: 5,
--   solvent: 4, bond_builder: 3, propellant: 2, uv_filter: 1

-- Auto-scoring run via the existing runFunctionGeneration()
-- (lib/ingredientScoring.ts, unchanged): 94 ingredients / 282 rows
-- generated. Verified after: still exactly 195 pre-existing duplicate-row
-- groups, zero new ones.

SELECT
  COUNT(DISTINCT i.id) as total,
  COUNT(DISTINCT cs.ingredient_id) as scored,
  ROUND(COUNT(DISTINCT cs.ingredient_id)::numeric / COUNT(DISTINCT i.id) * 100, 1) as pct
FROM ingredients i
LEFT JOIN compatibility_scores cs ON cs.ingredient_id = i.id;
-- Result: total=850, scored=699, pct=82.2
-- (Before this turn: 605/850, 71.2%)
