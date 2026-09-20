-- Three-pass ingredient coverage push, based on the diagnostic queries run
-- against the 480 completely-unscored ingredients: (1) delete confirmed
-- data-fragment rows, (2) add 5 new function categories + tag their
-- ingredients, (3) add botanical Latin-name patterns the first tagging
-- pass missed, then auto-score everything newly tagged.
--
-- No raw-SQL execution path exists for this project - the actual writes
-- ran via the Supabase JS client (service role). This file documents what
-- was applied and why several patterns from the original request were
-- narrowed or reordered after dry-running them against live data and
-- reading the actual matched names (the same discipline every prior
-- tagging pass this session has needed - broad ILIKE patterns keep
-- catching real ingredients that happen to share a substring).

-- ============================================================
-- PASS 1 - DATA QUALITY CLEANUP
-- ============================================================
--
-- The requested preview query matched 35 rows, not the "under 30" the
-- request's own threshold called for - and reading the list showed why:
-- the '* %' pattern (meant for footnote-marker fragments like "* 1"/"* 2")
-- and the '%)' pattern (meant for truncated labels like "Eau)") also
-- matched dozens of REAL ingredients that merely start with an asterisk
-- artifact or end in a parenthetical common name - including several
-- already scored and tagged in earlier turns ("* Ceramide NS", "* Moringa
-- Oleifera (moringa) Seed Oil", "* Rosa Canina (rosehip) Fruit Oil") and
-- several the THIS request's own Pass 2/3 patterns explicitly name as
-- real ingredients ("Titanium Dioxide (CI 77891)", "Iron Oxides (CI
-- 77491)", "Montmorillonite (pink Clay/argile Rose)"). Running the
-- DELETE as originally specified would have destroyed real, curated data.
--
-- Preview (for the record - do not run the DELETE below on this WHERE
-- clause, see the narrower one actually used further down):
SELECT id, inci_name, common_name FROM ingredients
WHERE
  inci_name ILIKE 'eau)%' OR
  inci_name = '* 2' OR
  inci_name ILIKE 'and scent%' OR
  inci_name ILIKE '* %' OR
  inci_name ILIKE '%.)' OR
  inci_name ILIKE '%)' OR
  (LENGTH(inci_name) < 3 AND inci_name NOT IN ('MI', 'UV')) OR
  inci_name ILIKE 'see %' OR
  inci_name ILIKE 'may contain%'
ORDER BY inci_name;
-- -> 35 rows. Reviewed individually; only 7 are genuine mis-parsed
-- fragments with zero compatibility_scores rows, zero primary_function
-- tags, and zero alias references (verified before deleting):
--   "And Scent.", "Eau)", "Miel)", "Violet 2 60730)", "Huile Minerale)",
--   "* 1", "* 2"
-- A duplicate class of the same issue was found separately while
-- reviewing Pass 3's oil-pattern matches: "This Oil Can Help Reduce
-- Breakage" (clearly parsed-out marketing copy, not an ingredient) -
-- same zero-references check, deleted alongside the other 7.
--
-- Left alone (real ingredients, NOT deleted): "Red 33 (CI 17200)",
-- "Cholecalciferol (vitamin D)", "Acetic Acid (apple Cider)", "Yellow 5
-- (CI 19140)", "Mica (CI 77019)", "Titanium Dioxide (CI 77891)", "Iron
-- Oxides (CI 77491)", "EXT. D&C VIOLET 2 (CI 60730)", "Acid Violet 43 (CI
-- 60730)", "Montmorillonite (pink Clay/argile Rose)", "Olus Oil
-- (vegetable Oil/huile Végétale)", "Vinegar (acetum)", "Sh-oligopeptide-78
-- (K18PEPTIDE™)", "Escherichia Coli Extract/...", and every "* <real
-- ingredient name>" entry (Coco-caprylate/caprate, Ethylhexyl Olivate,
-- Aspergillus Ferment, Polyporus Umbellatus Extract, Sargassum Filipendula
-- Extract, Eclipta Prostrata Extract, Santalum Album Oil, Hydrogenated
-- Ethylhexyl Olivate, Fructose, Hydroxyacetophenone). Also left alone:
-- "ACTIVE INGREDIENT: PYRITHIONE ZINC (1.0%)" - a garbled duplicate of the
-- already-scored "Zinc Pyrithione" entry, a data-quality issue worth a
-- targeted rename/merge, not a blind delete.

DELETE FROM catalog_product_ingredients WHERE ingredient_id IN (
  SELECT id FROM ingredients WHERE inci_name IN (
    'And Scent.', 'Eau)', 'Miel)', 'Violet 2 60730)', 'Huile Minerale)',
    '* 1', '* 2', 'This Oil Can Help Reduce Breakage'
  )
);
DELETE FROM ingredients WHERE inci_name IN (
  'And Scent.', 'Eau)', 'Miel)', 'Violet 2 60730)', 'Huile Minerale)',
  '* 1', '* 2', 'This Oil Can Help Reduce Breakage'
);
-- Result: 8 ingredients deleted, 61 catalog_product_ingredients links
-- removed. Total ingredients: 858 -> 850.

-- ============================================================
-- PASS 2 - NEW FUNCTION CATEGORIES
-- ============================================================
--
-- Added colorant/amino_acid/propellant/uv_filter/emulsifier to
-- FUNCTION_DEFAULT_SCORES (lib/compatibility.ts), the ingredient-tagging
-- tool's 16-card grid (now 21 cards, components/FunctionSelectorGrid.tsx),
-- and INGREDIENT_FUNCTION_LABELS (amino_acid/propellant/uv_filter were
-- missing there too; colorant/emulsifier already existed).

-- Free amino acids - all exact-name matches (ILIKE ANY with no wildcards
-- in any array element means exact match, not substring), so this
-- category carried far less overmatch risk than the others and needed no
-- corrections. Note this finally gives Arginine (left untagged 3 turns
-- ago specifically because 'protein' would have been wrong for a free
-- amino acid) its correct home.
UPDATE ingredients SET primary_function = 'amino_acid'
WHERE primary_function IS NULL AND inci_name ILIKE ANY(ARRAY[
  'serine', 'l-serine', 'proline', 'l-proline', 'threonine', 'l-threonine',
  'glutamic acid', 'l-glutamic acid', 'alanine', 'l-alanine', 'beta-alanine',
  'valine', 'l-valine', 'isoleucine', 'l-isoleucine', 'phenylalanine',
  'l-phenylalanine', 'aspartic acid', 'l-aspartic acid', 'histidine',
  'histidine hcl', 'l-histidine', 'leucine', 'l-leucine', 'lysine', 'l-lysine',
  'methionine', 'l-methionine', 'cysteine', 'l-cysteine', 'tryptophan',
  'l-tryptophan', 'tyrosine', 'l-tyrosine', 'glycine', 'l-glycine', 'arginine',
  'l-arginine', 'betaine', 'trimethylglycine', 'methylsulfonylmethane', 'msm'
]);
-- -> 14 rows.

-- Color additives - dry-running the color-word prefixes ('blue %', 'black
-- %', etc.) found 2 real botanical ingredients caught by the same words:
-- "Blue Green Algae" and "Black Tea Extract" (neither is a dye). Excluded
-- by exact name; Black Tea Extract falls through correctly to the
-- antioxidant catch-all in Pass 3 instead.
UPDATE ingredients SET primary_function = 'colorant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'ci %' OR inci_name ILIKE '% (ci %' OR
  inci_name ILIKE 'red %' OR inci_name ILIKE 'yellow %' OR
  inci_name ILIKE 'blue %' OR inci_name ILIKE 'green %' OR
  inci_name ILIKE 'violet %' OR inci_name ILIKE 'orange %' OR
  inci_name ILIKE 'black %' OR inci_name ILIKE '%dye%' OR
  inci_name ILIKE 'caramel' OR inci_name ILIKE 'annatto%' OR
  inci_name ILIKE 'carmine%' OR inci_name ILIKE 'iron oxide%' OR
  inci_name ILIKE 'titanium dioxide%' OR inci_name ILIKE 'ultramarines%' OR
  inci_name ILIKE 'chromium%oxide%'
)
AND inci_name NOT ILIKE 'blue green algae'
AND inci_name NOT ILIKE 'black tea extract';
-- -> 10 rows.

-- Propellants
UPDATE ingredients SET primary_function = 'propellant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'butane%' OR inci_name ILIKE 'isobutane%' OR
  inci_name ILIKE 'propane%' OR inci_name ILIKE '%hydrofluorocarbon%' OR
  inci_name ILIKE 'hfc-%' OR inci_name ILIKE 'dimethyl ether%' OR
  inci_name ILIKE 'nitrogen%'
);
-- -> 2 rows.

-- UV filters
UPDATE ingredients SET primary_function = 'uv_filter'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%benzophenone%' OR inci_name ILIKE '%ethylhexyl methoxycinnamate%' OR
  inci_name ILIKE '%avobenzone%' OR inci_name ILIKE '%octocrylene%' OR
  inci_name ILIKE '%octinoxate%' OR inci_name ILIKE '%homosalate%' OR
  inci_name ILIKE '%oxybenzone%' OR inci_name ILIKE '%tinosorb%' OR
  inci_name ILIKE '%uvinul%' OR inci_name ILIKE '%parsol%'
);
-- -> 1 row.

-- Emulsifiers - ran as originally specified, no issues found on review.
UPDATE ingredients SET primary_function = 'emulsifier'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%polyglyceryl-%' OR inci_name ILIKE '%sorbitan%' OR
  inci_name ILIKE 'peg-%' OR inci_name ILIKE '%polysorbate%' OR
  inci_name ILIKE '%ceteareth-%' OR inci_name ILIKE '%trideceth-%' OR
  inci_name ILIKE '%laureth-%' OR inci_name ILIKE '%steareth-%' OR
  inci_name ILIKE '%oleth-%' OR inci_name ILIKE '%ppg-%' OR
  inci_name ILIKE '%tween%' OR inci_name ILIKE '%span %'
);
-- -> 46 rows.

-- ============================================================
-- PASS 3 - BOTANICAL NAME PATTERNS
-- ============================================================
--
-- Reordered vs. the original request: "botanical extracts default to
-- antioxidant" (any name containing "extract") was specified BEFORE the
-- more specific scalp_active botanical-actives category, but nearly every
-- scalp_active pattern (clover, nettle, ginseng, centella, amla, sea
-- moss...) is itself always phrased as "... Extract" in real INCI names -
-- running the antioxidant catch-all first would have claimed every one of
-- them before the specific category got a chance, defeating its purpose
-- entirely. Moved the specific category before the catch-all.

-- Botanical oils (specific Latin names) - the bare "brassica" pattern
-- (meant for Brassica Campestris/rapeseed OIL) also matched 3 cationic
-- conditioning quats derived from brassica fatty chains
-- (Brassicamidopropyl Dimethylamine, Brassicamido-propyl Dimethylamine,
-- Brassicatrimonium Chloride) - same class of mistake as the
-- "hydroxypropyltrimonium" false positive found two turns ago. Excluded.
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%brassica%' OR inci_name ILIKE '%avena sativa%' OR
  inci_name ILIKE '%melia%' OR inci_name ILIKE '%azadirachta%' OR
  inci_name ILIKE '%crambe%' OR inci_name ILIKE '%triticum%' OR
  inci_name ILIKE '%daucus carota%' OR inci_name ILIKE '%orbignya%' OR
  inci_name ILIKE '%babassu%' OR inci_name ILIKE '%elaeis guineensis%' OR
  inci_name ILIKE '%elaeis%' OR inci_name ILIKE '%macadamia%' OR
  inci_name ILIKE '%calophyllum%' OR inci_name ILIKE '%emu oil%' OR
  inci_name ILIKE '%camellia%' OR inci_name ILIKE '%mauritia%' OR
  inci_name ILIKE '%carapa%' OR inci_name ILIKE '%perilla%' OR
  inci_name ILIKE '%borago%' OR inci_name ILIKE '%borage%' OR
  inci_name ILIKE '%oenothera%' OR inci_name ILIKE '%evening primrose%' OR
  inci_name ILIKE '%citrullus%' OR inci_name ILIKE '%pentaclethra%'
)
AND inci_name NOT ILIKE '%dimethylamine%'
AND inci_name NOT ILIKE '%trimonium chloride%';
-- -> 16 rows.

-- General oil/butter fallback - DROPPED the bare " oil" pattern from the
-- original request entirely. Dry-running it caught ~20 genuine ESSENTIAL
-- oils with no plant-part qualifier in the name (aniseed, sandalwood,
-- cedarwood, cardamom, fir, juniper, nutmeg, cypress, mandarin, lavandin,
-- galbanum) plus several named only by Latin binomial that the original
-- request's exclude list (checking for common names like "tea tree",
-- "geranium") couldn't catch - "Pelargonium Graveolens" IS geranium,
-- "Melaleuca Alternifolia" IS tea tree, neither string contains the word
-- the exclude list was checking for. Kept only the plant-part-qualified
-- patterns real carrier oils are actually named with, added the specific
-- essential-oil names found, and separately re-added 5 individually-
-- verified genuine carrier oils that the qualifier patterns miss for
-- other reasons (no qualifier at all, or a typo splitting the qualifier
-- from "oil" with a parenthetical).
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%seed oil%' OR inci_name ILIKE '%kernel oil%' OR
  inci_name ILIKE '%fruit oil%' OR inci_name ILIKE '%nut oil%' OR
  inci_name ILIKE '%butter%' OR
  inci_name IN ('Cocos Nucifera Oil', '*cocos Nucifera (coconut) Oil',
    'Glycine Soja Oil', 'Hydrogenated Vegetable Oil',
    'Bitus Vinifera (grape Seed) Oil')
)
AND inci_name NOT ILIKE '%petroleum%' AND inci_name NOT ILIKE '%mineral oil%'
AND inci_name NOT ILIKE '%fragrance%' AND inci_name NOT ILIKE '%essential oil%'
AND inci_name NOT ILIKE '%tea tree%' AND inci_name NOT ILIKE '%peppermint%'
AND inci_name NOT ILIKE '%mentha%' AND inci_name NOT ILIKE '%eucalyptus%'
AND inci_name NOT ILIKE '%lavender%' AND inci_name NOT ILIKE '%ylang%'
AND inci_name NOT ILIKE '%lemon oil%' AND inci_name NOT ILIKE '%orange oil%'
AND inci_name NOT ILIKE '%bergamot%' AND inci_name NOT ILIKE '%clary sage%'
AND inci_name NOT ILIKE '%rosemary oil%' AND inci_name NOT ILIKE '%rosemarinus%'
AND inci_name NOT ILIKE '%lavandula%' AND inci_name NOT ILIKE '%citrus%'
AND inci_name NOT ILIKE '%geranium%' AND inci_name NOT ILIKE '%spearmint%'
AND inci_name NOT ILIKE '%aniseed%' AND inci_name NOT ILIKE '%pimpinella anisum%'
AND inci_name NOT ILIKE '%basilicum%' AND inci_name NOT ILIKE '%zingiber officinale%'
AND inci_name NOT ILIKE '%santalum album%' AND inci_name NOT ILIKE '%amyris balsamifera%'
AND inci_name NOT ILIKE '%elettaria cardamomum%' AND inci_name NOT ILIKE '%ferula galbaniflua%'
AND inci_name NOT ILIKE '%cedarwood%' AND inci_name NOT ILIKE '%mandarin oil%'
AND inci_name NOT ILIKE '%lavandin%' AND inci_name NOT ILIKE '%cardamom oil%'
AND inci_name NOT ILIKE '%fir oil%' AND inci_name NOT ILIKE '%juniper oil%'
AND inci_name NOT ILIKE '%nutmeg oil%' AND inci_name NOT ILIKE '%cypress oil%'
AND inci_name NOT ILIKE '%juniperus virginiana%' AND inci_name NOT ILIKE '%eugenia caryophyllus%'
AND inci_name NOT ILIKE '%pelargonium graveolens%' AND inci_name NOT ILIKE '%pogostemon cablin%'
AND inci_name NOT ILIKE '%melaleuca alternifolia%';
-- -> 18 rows.

-- Fatty acids
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'stearic acid%' OR inci_name ILIKE 'palmitic acid%' OR
  inci_name ILIKE 'myristic acid%' OR inci_name ILIKE 'lauric acid%' OR
  inci_name ILIKE 'oleic acid%' OR inci_name ILIKE 'linoleic acid%' OR
  inci_name ILIKE 'linolenic acid%' OR inci_name ILIKE 'arachidic acid%' OR
  inci_name ILIKE 'behenic acid%' OR inci_name ILIKE 'erucic acid%'
);
-- -> 4 rows.

-- Esters/alkyl compounds
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'c12-15 alkyl%' OR inci_name ILIKE 'c13-15 alkane%' OR
  inci_name ILIKE 'c11-15 alketh%' OR inci_name ILIKE '%ethyl oleate%' OR
  inci_name ILIKE '%ethyl linoleate%' OR inci_name ILIKE '%propyl myristate%' OR
  inci_name ILIKE '%methyl gluceth%' OR inci_name ILIKE '%myristyl myristate%' OR
  inci_name ILIKE '%cetyl palmitate%' OR inci_name ILIKE '%stearyl stearate%'
);
-- -> 6 rows.

-- Silica/mineral pigments/starches
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'silica%' OR inci_name ILIKE '%silicon dioxide%' OR
  inci_name ILIKE '%kaolin%' OR inci_name ILIKE '%bentonite%' OR
  inci_name ILIKE '%hectorite%' OR inci_name ILIKE '%montmorillonite%' OR
  (inci_name ILIKE 'zea mays%' AND inci_name ILIKE '%starch%') OR
  inci_name ILIKE '%corn starch%' OR inci_name ILIKE '%tapioca starch%' OR
  inci_name ILIKE '%rice starch%' OR
  (inci_name ILIKE 'oryza sativa%' AND inci_name ILIKE '%starch%')
);
-- -> 9 rows. Note: "Hydrolyzed Corn Starch" correctly lands here rather
-- than protein - it was explicitly excluded from the protein category's
-- bare "hydrolyzed" pattern 3 turns ago for exactly this reason.

-- Glycolic acid and AHAs
UPDATE ingredients SET primary_function = 'ph_adjuster'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'glycolic acid%' OR inci_name ILIKE 'tartaric acid%' OR
  inci_name ILIKE 'mandelic acid%' OR inci_name ILIKE 'lactobionic acid%'
);
-- -> 2 rows.

-- Fragrance chemicals not caught previously
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%vanillin%' OR inci_name ILIKE '%pinene%' OR
  inci_name ILIKE '%terpinolene%' OR inci_name ILIKE '%acetyl cedrene%' OR
  inci_name ILIKE '%hexamethylindanopyran%' OR inci_name ILIKE '%geranyl acetate%' OR
  inci_name ILIKE '%musk%' OR inci_name ILIKE '%iso e super%' OR
  inci_name ILIKE '%ambroxan%' OR inci_name ILIKE '%galaxolide%' OR
  inci_name ILIKE '%tonalide%' OR inci_name ILIKE '%hedione%' OR
  inci_name ILIKE '%dihydromyrcenol%' OR inci_name ILIKE '%verdox%' OR
  inci_name ILIKE '%verdyl acetate%' OR inci_name ILIKE '%terpineol%' OR
  inci_name ILIKE '%myrcene%' OR inci_name ILIKE '%camphene%' OR
  inci_name ILIKE '%sabinene%' OR inci_name ILIKE '%ocimene%'
);
-- -> 7 rows.

-- Conditioning surfactants missed previously
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%brassicamidopropyl%' OR inci_name ILIKE '%cocamidopropyl%' OR
  inci_name ILIKE '%stearylamidopropyl%' OR inci_name ILIKE '%lauramidopropyl%' OR
  inci_name ILIKE '%oleamidopropyl%' OR inci_name ILIKE '%ricinoleamidopropyl%' OR
  inci_name ILIKE 'trisodium dicarboxymethyl%'
);
-- -> 5 rows.

-- Clover, nettle, and other botanical scalp actives - MOVED BEFORE the
-- antioxidant catch-all below (see note at the top of Pass 3).
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%trifolium%' OR inci_name ILIKE '%clover%extract%' OR
  inci_name ILIKE '%nettle%' OR inci_name ILIKE '%urtica%' OR
  inci_name ILIKE '%horsetail%' OR inci_name ILIKE '%equisetum%' OR
  inci_name ILIKE '%ginseng%' OR inci_name ILIKE '%panax%' OR
  inci_name ILIKE '%centella%' OR inci_name ILIKE '%gotu kola%' OR
  inci_name ILIKE '%bhringraj%' OR inci_name ILIKE '%eclipta%' OR
  inci_name ILIKE '%amla%' OR inci_name ILIKE '%phyllanthus%' OR
  inci_name ILIKE '%sea moss%' OR inci_name ILIKE '%chondrus crispus%' OR
  inci_name ILIKE '%irish moss%' OR inci_name ILIKE '%colloidal oatmeal%' OR
  (inci_name ILIKE '%avena sativa%' AND inci_name ILIKE '%extract%') OR
  inci_name ILIKE '%zanthoxylum%' OR inci_name ILIKE '%phytosterol%' OR
  inci_name ILIKE '%plant sterol%'
);
-- -> 16 rows. (Phytosterols/Plant Sterol as scalp_active is a debatable
-- domain call - structurally more like a conditioning lipid than a
-- scalp-condition-targeting active - left as the request specified since
-- it's a deliberate categorization choice, not a substring bug.)

-- Botanical extracts, generic antioxidant default - runs LAST, after
-- every more specific "...Extract"-named category above has already
-- claimed its ingredients.
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND inci_name ILIKE '%extract%'
AND inci_name NOT ILIKE '%fragrance%' AND inci_name NOT ILIKE '%parfum%';
-- -> 125 rows.

-- ============================================================
-- RESULTS
-- ============================================================
--
-- Rows updated per UPDATE, Pass 2 then Pass 3 in order:
--   amino_acid: 14, colorant: 10, propellant: 2, uv_filter: 1,
--   emulsifier: 46, emollient(botanical oils): 16,
--   emollient(general fallback): 18, emollient(fatty acids): 4,
--   emollient(esters): 6, thickener: 9, ph_adjuster: 2, fragrance: 7,
--   conditioning_agent: 5, scalp_active: 16, antioxidant: 125
--   Total: 281 ingredients newly tagged.
--
-- Final function tag distribution (850 total ingredients after Pass 1):
--   still untagged: 280, antioxidant: 135, emollient: 91, emulsifier: 46,
--   conditioning_agent: 42, protein: 29, scalp_active: 29, fragrance: 28,
--   thickener: 23, humectant: 22, occlusive: 22, film_former: 20,
--   surfactant: 19, preservative: 16, amino_acid: 14, colorant: 10,
--   ph_adjuster: 9, chelating_agent: 5, solvent: 4, bond_builder: 3,
--   propellant: 2, uv_filter: 1
--
-- Auto-scoring run via the existing runFunctionGeneration()
-- (lib/ingredientScoring.ts, unchanged) against everything newly tagged
-- with no compatibility_scores row: 227 ingredients / 681 rows generated.
-- Verified after: still exactly 195 pre-existing duplicate-row groups,
-- zero new ones.
--
-- Coverage: 378/850 (44.5%) -> 605/850 (71.2%) scored.
