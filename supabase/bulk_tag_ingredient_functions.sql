-- Bulk-tags ingredients.primary_function by INCI-name pattern matching
-- (only where primary_function IS NULL - never overwrites an existing
-- tag), then generates compatibility_scores rows from FUNCTION_DEFAULT_SCORES
-- for every ingredient that ends up tagged with no DB score yet.
--
-- No raw-SQL execution path exists for this project (no CLI link, no direct
-- Postgres connection string, no exec-sql RPC) - the actual writes ran via
-- the Supabase JS client (service role). This file is a documentation
-- record of the exact patterns applied, run in this exact order (later
-- categories only see ingredients still untagged by earlier ones, so
-- category order matters and is preserved below).
--
-- Corrections applied vs. the original request, found by dry-running every
-- category and reviewing the actual matched names before writing anything -
-- four bare/loose patterns produced real false positives in the live data:
--
--  1. HUMECTANTS' bare "hydroxypropyltrimonium" matched ONLY cationic
--     conditioning quats (Cocoglucosides/Locust Bean/Trigonella
--     Foenum-graecum/Starch Hydroxypropyltrimonium Chloride) - none of
--     which are humectants by mechanism. Dropped the pattern entirely;
--     left those 4 untagged rather than mistagged (one of them, Locust
--     Bean Hydroxypropyltrimonium Chloride, ended up correctly caught by
--     the thickener category's "locust bean" pattern later anyway).
--  2. HUMECTANTS' "honey" pattern used the request's own bare "mel " token,
--     which matched "Schinziophyton Rautanenii KEMEL Oil" (a real oil,
--     already tagged by the emollient category's own "manketti"/"mongongo"
--     patterns) - tightened to require "Mel" as the name's first word
--     (how the real INCI name for honey appears), not any substring
--     containing it.
--  3. HUMECTANTS' "urea" pattern (bare substring) matched "PurpUREA" and
--     "VirgAUREA" (botanical Latin species-name suffixes, found via a
--     pre-flight check against live data) - tightened to require "urea"
--     as its own trailing word, which still catches "Urea" and
--     "Diazolidinyl/Imidazolidinyl Urea" but not those two plant names.
--  4. EMOLLIENT's "mango" pattern caught "Organic Mango Fruit Extract" (a
--     general botanical extract, not a fatty butter/oil) and PROTEIN's
--     "quinoa" pattern caught "Chenopodium Quinoa Seed Extract" (same
--     issue) - both excluded by exact name; left untagged rather than
--     mistagged.
--  5. SOLVENT's bare "ethanol" pattern would have caught two malformed
--     duplicate spellings of "Phenoxyethanol" already in the live data
--     ("Phe-noxyethanol" and "Phenoxy- Ethanol" - a stray hyphen breaks up
--     the name enough that neither the preservative category's exact
--     "phenoxyethanol" pattern nor a simple "phenoxy" exclusion here
--     catches them). Excluded by exact name; left untagged rather than
--     mistagged as solvent. Worth a separate data-quality cleanup pass on
--     these two duplicate/malformed ingredient rows.

-- 1. HUMECTANTS
UPDATE ingredients SET primary_function = 'humectant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%glycerin%' OR inci_name ILIKE '%glycerol%' OR
  inci_name ILIKE '%propylene glycol%' OR inci_name ILIKE '%propanediol%' OR
  inci_name ILIKE '%butylene glycol%' OR inci_name ILIKE '%pentylene glycol%' OR
  inci_name ILIKE '%hexylene glycol%' OR inci_name ILIKE '%sorbitol%' OR
  inci_name ILIKE '%xylitol%' OR inci_name ILIKE '%erythritol%' OR
  inci_name ILIKE '%sodium pca%' OR inci_name ILIKE '%hyaluronic acid%' OR
  inci_name ILIKE '%sodium hyaluronate%' OR inci_name ILIKE '%panthenol%' OR
  inci_name ILIKE '%pro-vitamin b5%' OR inci_name ILIKE '%provitamin b5%' OR
  inci_name ILIKE '%aloe%' OR inci_name ILIKE '%honey%' OR
  inci_name ILIKE '%trehalose%' OR inci_name ILIKE '%inositol%' OR
  inci_name ILIKE '%niacinamide%' OR inci_name ILIKE '%allantoin%' OR
  inci_name ILIKE 'mel' OR inci_name ILIKE 'mel %' OR                 -- fix #2: word-start only
  inci_name ILIKE 'urea' OR inci_name ILIKE '% urea'                  -- fix #3: word-end only
  -- fix #1: bare "hydroxypropyltrimonium" removed entirely
);

-- 2. OCCLUSIVES / SILICONES
UPDATE ingredients SET primary_function = 'occlusive'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%dimethicone%' OR inci_name ILIKE '%dimethiconol%' OR
  inci_name ILIKE '%cyclomethicone%' OR inci_name ILIKE '%cyclopentasiloxane%' OR
  inci_name ILIKE '%cyclotetrasiloxane%' OR inci_name ILIKE '%trimethylsiloxysili%' OR
  inci_name ILIKE '%amodimethicone%' OR inci_name ILIKE '%phenyl trimethicone%' OR
  inci_name ILIKE '%silicone%' OR inci_name ILIKE '%siloxane%' OR
  inci_name ILIKE '%petrolatum%' OR inci_name ILIKE '%mineral oil%' OR
  inci_name ILIKE '%paraffinum liquidum%' OR inci_name ILIKE '%lanolin%' OR
  inci_name ILIKE '%beeswax%' OR inci_name ILIKE '%cera alba%' OR
  inci_name ILIKE '%carnauba%' OR inci_name ILIKE '%candelilla%'
);

-- 3. EMOLLIENTS (oils, esters, butters)
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%jojoba%' OR inci_name ILIKE '%simmondsia%' OR
  inci_name ILIKE '%argan%' OR inci_name ILIKE '%argania%' OR
  inci_name ILIKE '%grapeseed%' OR inci_name ILIKE '%vitis vinifera%' OR
  inci_name ILIKE '%sweet almond%' OR inci_name ILIKE '%prunus amygdalus%' OR
  inci_name ILIKE '%prunus dulcis%' OR inci_name ILIKE '%avocado%' OR
  inci_name ILIKE '%persea%' OR inci_name ILIKE '%olive%' OR
  inci_name ILIKE '%olea europaea%' OR inci_name ILIKE '%sunflower%' OR
  inci_name ILIKE '%helianthus annuus%' OR inci_name ILIKE '%hemp seed%' OR
  inci_name ILIKE '%cannabis sativa%' OR inci_name ILIKE '%marula%' OR
  inci_name ILIKE '%sclerocarya%' OR inci_name ILIKE '%baobab%' OR
  inci_name ILIKE '%adansonia%' OR inci_name ILIKE '%moringa%' OR
  inci_name ILIKE '%sea buckthorn%' OR inci_name ILIKE '%hippophae%' OR
  inci_name ILIKE '%meadowfoam%' OR inci_name ILIKE '%limnanthes%' OR
  inci_name ILIKE '%rosehip%' OR inci_name ILIKE '%rosa canina%' OR
  inci_name ILIKE '%black seed%' OR inci_name ILIKE '%nigella sativa%' OR
  inci_name ILIKE '%pumpkin seed%' OR inci_name ILIKE '%cucurbita%' OR
  inci_name ILIKE '%sesame%' OR inci_name ILIKE '%sesamum%' OR
  inci_name ILIKE '%shea%' OR inci_name ILIKE '%butyrospermum%' OR
  inci_name ILIKE '%mango%' OR inci_name ILIKE '%mangifera%' OR
  inci_name ILIKE '%cocoa butter%' OR inci_name ILIKE '%theobroma%' OR
  inci_name ILIKE '%kokum%' OR inci_name ILIKE '%murumuru%' OR
  inci_name ILIKE '%ucuuba%' OR inci_name ILIKE '%cupuacu%' OR
  inci_name ILIKE '%mafura%' OR inci_name ILIKE '%mongongo%' OR
  inci_name ILIKE '%manketti%' OR inci_name ILIKE '%caprylic%' OR
  inci_name ILIKE '%capric%' OR inci_name ILIKE '%isopropyl myristate%' OR
  inci_name ILIKE '%isopropyl palmitate%' OR inci_name ILIKE '%ethylhexyl palmitate%' OR
  inci_name ILIKE '%cetyl ethylhexanoate%' OR inci_name ILIKE '%dicaprylyl%' OR
  inci_name ILIKE '%squalane%' OR inci_name ILIKE '%hemisqualane%' OR
  inci_name ILIKE '%isododecane%' OR inci_name ILIKE '%isohexadecane%'
)
AND inci_name NOT ILIKE '%mango fruit extract%';  -- fix #4

-- 4. PROTEINS
UPDATE ingredients SET primary_function = 'protein'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%hydrolyzed%' OR inci_name ILIKE '%keratin%' OR
  inci_name ILIKE '%collagen%' OR inci_name ILIKE '%elastin%' OR
  inci_name ILIKE '%silk amino%' OR inci_name ILIKE '%wheat amino%' OR
  inci_name ILIKE '%soy amino%' OR inci_name ILIKE '%oat amino%' OR
  inci_name ILIKE '%rice amino%' OR inci_name ILIKE '%quinoa%'
)
AND inci_name NOT ILIKE '%hydrolyzed starch%'
AND inci_name NOT ILIKE '%hydrolyzed corn%'
AND inci_name NOT ILIKE '%hydrolyzed wheat starch%'
AND inci_name NOT ILIKE '%quinoa seed extract%';  -- fix #4

-- 5. SURFACTANTS
UPDATE ingredients SET primary_function = 'surfactant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%sodium lauryl sulfate%' OR inci_name ILIKE '%sodium laureth sulfate%' OR
  inci_name ILIKE '%ammonium lauryl sulfate%' OR inci_name ILIKE '%ammonium laureth sulfate%' OR
  inci_name ILIKE '%sodium cocoyl%' OR inci_name ILIKE '%sodium lauroyl%' OR
  inci_name ILIKE '%disodium cocoyl%' OR inci_name ILIKE '%cocamidopropyl betaine%' OR
  inci_name ILIKE '%cocamidopropyl hydroxysultaine%' OR inci_name ILIKE '%lauryl betaine%' OR
  inci_name ILIKE '%coco betaine%' OR inci_name ILIKE '%decyl glucoside%' OR
  inci_name ILIKE '%lauryl glucoside%' OR inci_name ILIKE '%coco glucoside%' OR
  inci_name ILIKE '%caprylyl glucoside%' OR inci_name ILIKE '%cocamide%' OR
  inci_name ILIKE '%lauramide%' OR inci_name ILIKE '%sodium c14-16%' OR
  inci_name ILIKE '%olefin sulfonate%'
);

-- 6. CONDITIONING AGENTS (quats and fatty alcohols)
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%behentrimonium%' OR inci_name ILIKE '%cetrimonium%' OR
  inci_name ILIKE '%stearamidopropyl%' OR inci_name ILIKE '%quaternium%' OR
  inci_name ILIKE '%polyquaternium%' OR inci_name ILIKE '%guar hydroxy%' OR
  inci_name ILIKE '%hydroxypropyl guar%' OR inci_name ILIKE '%cassia hydroxy%' OR
  inci_name ILIKE '%cetyl alcohol%' OR inci_name ILIKE '%cetearyl alcohol%' OR
  inci_name ILIKE '%behenyl alcohol%' OR inci_name ILIKE '%stearyl alcohol%' OR
  inci_name ILIKE '%myristyl alcohol%'
);

-- 7. FILM FORMERS (hold and definition)
UPDATE ingredients SET primary_function = 'film_former'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%pvp%' OR inci_name ILIKE '%polyvinylpyrrolidone%' OR
  inci_name ILIKE '%pvm/ma%' OR inci_name ILIKE '%acrylate%' OR
  inci_name ILIKE '%acrylamide%' OR inci_name ILIKE '%polyurethane%' OR
  inci_name ILIKE '%vp/va%' OR inci_name ILIKE '%vinylcaprolactam%' OR
  inci_name ILIKE '%flaxseed%' OR inci_name ILIKE '%linum usitatissimum%' OR
  inci_name ILIKE '%xanthan gum%' OR inci_name ILIKE '%hydroxyethylcellulose%' OR
  inci_name ILIKE '%hydroxypropylcellulose%' OR inci_name ILIKE '%carboxymethylcellulose%' OR
  inci_name ILIKE '%pectin%' OR inci_name ILIKE '%gelatin%' OR
  inci_name ILIKE '%maltodextrin%' OR inci_name ILIKE '%pullulan%'
);

-- 8. PRESERVATIVES
UPDATE ingredients SET primary_function = 'preservative'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%phenoxyethanol%' OR inci_name ILIKE '%benzyl alcohol%' OR
  inci_name ILIKE '%ethylhexylglycerin%' OR inci_name ILIKE '%caprylyl glycol%' OR
  inci_name ILIKE '%chlorphenesin%' OR inci_name ILIKE '%sodium benzoate%' OR
  inci_name ILIKE '%potassium sorbate%' OR inci_name ILIKE '%sorbic acid%' OR
  inci_name ILIKE '%benzoic acid%' OR inci_name ILIKE '%dehydroacetic acid%' OR
  inci_name ILIKE '%methylisothiazolinone%' OR inci_name ILIKE '%methylchloroisothiazolinone%' OR
  inci_name ILIKE '%dmdm hydantoin%' OR inci_name ILIKE '%imidazolidinyl urea%' OR
  inci_name ILIKE '%diazolidinyl urea%' OR inci_name ILIKE '%parabens%' OR
  inci_name ILIKE '%methylparaben%' OR inci_name ILIKE '%propylparaben%' OR
  inci_name ILIKE '%butylparaben%' OR inci_name ILIKE '%ethylparaben%' OR
  inci_name ILIKE '%iodopropynyl%' OR inci_name ILIKE '%glyceryl caprylate%' OR
  inci_name ILIKE '%sodium levulinate%' OR inci_name ILIKE '%sodium anisate%'
);

-- 9. FRAGRANCE COMPONENTS
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%parfum%' OR inci_name ILIKE '%fragrance%' OR
  inci_name ILIKE '%aroma%' OR inci_name ILIKE '%limonene%' OR
  inci_name ILIKE '%linalool%' OR inci_name ILIKE '%citronellol%' OR
  inci_name ILIKE '%geraniol%' OR inci_name ILIKE '%eugenol%' OR
  inci_name ILIKE '%coumarin%' OR inci_name ILIKE '%cinnamal%' OR
  inci_name ILIKE '%benzyl%' OR inci_name ILIKE '%hydroxycitronellal%' OR
  inci_name ILIKE '%citral%' OR inci_name ILIKE '%farnesol%' OR
  inci_name ILIKE '%isoeugenol%' OR inci_name ILIKE '%linalyl acetate%' OR
  inci_name ILIKE '%amyl cinnamal%' OR inci_name ILIKE '%hexyl cinnamal%' OR
  inci_name ILIKE '%anise alcohol%' OR inci_name ILIKE '%polycitronellol%' OR
  inci_name ILIKE '%tetramethyl acetyl%'
);

-- 10. PH ADJUSTERS
UPDATE ingredients SET primary_function = 'ph_adjuster'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%sodium hydroxide%' OR inci_name ILIKE '%potassium hydroxide%' OR
  inci_name ILIKE '%triethanolamine%' OR inci_name ILIKE '%aminomethyl propanol%' OR
  inci_name ILIKE '%lactic acid%' OR inci_name ILIKE '%citric acid%' OR
  inci_name ILIKE '%phosphoric acid%' OR inci_name ILIKE '%acetic acid%' OR
  inci_name ILIKE '%gluconolactone%' OR inci_name ILIKE '%sodium gluconate%'
);

-- 11. CHELATING AGENTS
UPDATE ingredients SET primary_function = 'chelating_agent'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%edta%' OR inci_name ILIKE '%sodium phytate%' OR
  inci_name ILIKE '%phytic acid%' OR inci_name ILIKE '%sodium gluconate%' OR
  inci_name ILIKE '%tetrasodium%' OR inci_name ILIKE '%disodium edta%' OR
  inci_name ILIKE '%trisodium edta%'
);

-- 12. THICKENERS / RHEOLOGY MODIFIERS
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%carbomer%' OR inci_name ILIKE '%carbopol%' OR
  inci_name ILIKE '%acrylates crosspolymer%' OR inci_name ILIKE '%hydroxyethylcellulose%' OR
  inci_name ILIKE '%hydroxypropyl guar%' OR inci_name ILIKE '%cellulose%' OR
  inci_name ILIKE '%guar gum%' OR inci_name ILIKE '%locust bean%' OR
  inci_name ILIKE '%carrageenan%' OR inci_name ILIKE '%agar%' OR
  inci_name ILIKE '%gellan gum%' OR inci_name ILIKE '%sclerotium gum%' OR
  inci_name ILIKE '%tara gum%'
);

-- 13. ANTIOXIDANTS
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%tocopherol%' OR inci_name ILIKE '%vitamin e%' OR
  inci_name ILIKE '%ascorbic acid%' OR inci_name ILIKE '%vitamin c%' OR
  inci_name ILIKE '%rosemary extract%' OR inci_name ILIKE '%rosmarinus officinalis%' OR
  inci_name ILIKE '%green tea%' OR inci_name ILIKE '%camellia sinensis%' OR
  inci_name ILIKE '%ferulic acid%' OR inci_name ILIKE '%resveratrol%' OR
  inci_name ILIKE '%noni%' OR inci_name ILIKE '%morinda%' OR
  inci_name ILIKE '%pomegranate%' OR inci_name ILIKE '%punica granatum%'
);

-- 14. SCALP ACTIVES
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%rosemary%' OR inci_name ILIKE '%rosmarinus%' OR
  inci_name ILIKE '%caffeine%' OR inci_name ILIKE '%saw palmetto%' OR
  inci_name ILIKE '%serenoa%' OR inci_name ILIKE '%pumpkin seed%' OR
  inci_name ILIKE '%cucurbita pepo%' OR inci_name ILIKE '%biotin%' OR
  inci_name ILIKE '%zinc pyrithione%' OR inci_name ILIKE '%piroctone olamine%' OR
  inci_name ILIKE '%salicylic acid%' OR inci_name ILIKE '%selenium sulfide%' OR
  inci_name ILIKE '%peppermint%' OR inci_name ILIKE '%mentha%' OR
  inci_name ILIKE '%menthol%' OR inci_name ILIKE '%niacinamide%' OR
  inci_name ILIKE '%minoxidil%'
);

-- 15. BOND BUILDERS
UPDATE ingredients SET primary_function = 'bond_builder'
WHERE primary_function IS NULL AND (
  inci_name ILIKE '%bis-aminopropyl%' OR inci_name ILIKE '%maleic acid%' OR
  inci_name ILIKE '%crotonyl%' OR inci_name ILIKE '%glyoxylic%' OR
  inci_name ILIKE '%succinic acid%' OR inci_name ILIKE '%malic acid%' OR
  inci_name ILIKE '%acetyl cysteine%' OR inci_name ILIKE '%olaplex%'
);

-- 16. SOLVENTS
UPDATE ingredients SET primary_function = 'solvent'
WHERE primary_function IS NULL AND (
  inci_name ILIKE 'aqua' OR inci_name ILIKE 'water' OR inci_name ILIKE 'eau' OR
  inci_name ILIKE '%alcohol denat%' OR inci_name ILIKE '%denatured alcohol%' OR
  inci_name ILIKE '%isopropyl alcohol%' OR inci_name ILIKE '%ethanol%'
)
AND inci_name NOT ILIKE '%cetyl alcohol%'
AND inci_name NOT ILIKE '%cetearyl alcohol%'
AND inci_name NOT ILIKE '%behenyl alcohol%'
AND inci_name NOT ILIKE '%stearyl alcohol%'
AND inci_name NOT ILIKE '%phe-noxyethanol%'
AND inci_name NOT ILIKE '%phenoxy- ethanol%';  -- fix #5

-- Rows affected by each UPDATE, in order:
--   humectant: 11, occlusive: 7, emollient: 29, protein: 6, surfactant: 6,
--   conditioning_agent: 7, film_former: 19, preservative: 14, fragrance: 3,
--   ph_adjuster: 2, chelating_agent: 0, thickener: 7, antioxidant: 10,
--   scalp_active: 6, bond_builder: 2, solvent: 2
--   total: 131 ingredients newly tagged

-- Function tag distribution after tagging:
--   still untagged: 569, emollient: 47, conditioning_agent: 37, protein: 29,
--   humectant: 22, occlusive: 22, fragrance: 21, film_former: 20,
--   surfactant: 19, preservative: 16, thickener: 14, scalp_active: 13,
--   antioxidant: 10, ph_adjuster: 7, chelating_agent: 5, solvent: 4,
--   bond_builder: 3

-- Newly auto-scoreable (function tag, no DB score) at that point: 71
-- ingredients / 213 rows - generated via the existing runFunctionGeneration()
-- in lib/ingredientScoring.ts (same code the admin Coverage tab's "Run
-- generation" button calls), which was already fixed for the 1000-row
-- PostgREST pagination bug found last turn. No duplicates resulted
-- (verified after: still exactly 195 pre-existing duplicate-row groups,
-- zero new ones).

INSERT INTO compatibility_scores (ingredient_id, porosity, score, rating, reason)
SELECT i.id, p.porosity,
  -- score = FUNCTION_DEFAULT_SCORES[i.primary_function][p.porosity], see
  -- lib/compatibility.ts - not expressible as a plain SQL CASE without
  -- restating that whole table, which is why this ran through the real
  -- TypeScript function instead.
  NULL, NULL,
  'Auto-generated from function tag: ' || i.primary_function || '. Review recommended.'
FROM ingredients i
CROSS JOIN (VALUES ('low'),('medium'),('high')) AS p(porosity)
WHERE i.primary_function IS NOT NULL
  AND i.id NOT IN (SELECT DISTINCT ingredient_id FROM compatibility_scores)
LIMIT 0; -- documentation only - see note above, this ran via TypeScript

-- Coverage before/after:
--   Before: 307/858 scored (35.8%)
--   After:  378/858 scored (44.1%)
