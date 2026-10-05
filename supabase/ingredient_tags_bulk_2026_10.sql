-- Record of the bulk ingredient tagging run (applied via the service-role
-- client, not by pasting this file). Only rows with primary_function IS NULL
-- were touched. Each UPDATE below matches what the script ran; ORs are
-- parenthesised so the NULL guard applies to every pattern.

-- pass 1: shea butter
UPDATE ingredients SET primary_function = 'occlusive'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'butyrospermumparkii%'
    OR inci_name ILIKE 'butyrospermum parkii%'
    OR inci_name ILIKE '%shea%butter%'
    OR inci_name ILIKE '%butyrospermum%'
);

-- pass 1: squalene
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'squalene%'
);

-- pass 1: ginger root oil
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%zingiber%oil%'
    OR inci_name ILIKE '*zingiber%'
    OR inci_name ILIKE '%ginger%root%oil%'
);

-- pass 1: eucalyptus oil
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%eucalyptus%oil%'
    OR inci_name ILIKE '%eucalyptus%leaf%'
);

-- pass 1: chebe
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%chebe%'
    OR inci_name ILIKE '%croton zambesicus%'
);

-- pass 1: beta-sitosterol
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%beta-sitosterol%'
    OR inci_name ILIKE '%beta sitosterol%'
);

-- pass 1: cinnamidopropyltrimonium
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%cinnamidopropyltrimonium%'
);

-- pass 1: guar gum
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%cyamopsis%'
    OR inci_name ILIKE '%guar gum%'
    OR inci_name ILIKE '%guar%tetragonoloba%'
);

-- pass 1: arachidyl alcohol
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'arachidyl alcohol%'
);

-- pass 1: ethylhexyl olivate
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'ethylhexylolivate%'
    OR inci_name ILIKE 'ethylhexyl olivate%'
    OR inci_name ILIKE '* ethylhexyl olivate%'
);

-- pass 1: distearoylethyl dimonium
UPDATE ingredients SET primary_function = 'conditioning_agent'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%distearoylethyl dimonium%'
);

-- pass 1: hydroxyacetophenone
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '* hydroxyacetophenone%'
    OR inci_name ILIKE 'hydroxyacetophenone%'
);

-- pass 2: palmitoyl
UPDATE ingredients SET primary_function = 'bond_builder'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'palmitoyl%'
);

-- pass 2: carvone
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'carvone%'
);

-- pass 2: cymbopogon
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%cymbopogon%'
);

-- pass 2: vanilla
UPDATE ingredients SET primary_function = 'fragrance'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%vanilla%extract%'
    OR inci_name ILIKE '%vanilla planifolia%'
);

-- pass 2: millet seed extract
UPDATE ingredients SET primary_function = 'protein'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%panicum miliaceum%'
    OR inci_name ILIKE '%millet%seed%extract%'
);

-- pass 2: arachidyl glucoside
UPDATE ingredients SET primary_function = 'emulsifier'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%arachidyl glucoside%'
);

-- pass 2: tetramethylhydroxypiperidinol citrate
UPDATE ingredients SET primary_function = 'uv_filter'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%tetramethylhydroxy%'
    OR inci_name ILIKE '%piperidinol%'
);

-- pass 2: peg-90m
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'peg-90m%'
    OR inci_name ILIKE 'peg/ppg%trimethylolpropane%'
);

-- pass 2: isoamyl laurate
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%isoamyl laurate%'
);

-- pass 2: chitosan
UPDATE ingredients SET primary_function = 'film_former'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%chitosan%'
);

-- pass 2: benzotriazolyl dodecyl p-cresol
UPDATE ingredients SET primary_function = 'uv_filter'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%benzotriazolyl%'
    OR inci_name ILIKE '%dodecyl p-cresol%'
);

-- pass 2: tasmannia pepperberry
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%tasmannia%'
    OR inci_name ILIKE '%pepperberry%'
);

-- pass 2: kunzea muntrie
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%kunzea%'
    OR inci_name ILIKE '%muntrie%'
);

-- pass 2: diphenylsiloxy phenyl trimethicone
UPDATE ingredients SET primary_function = 'occlusive'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%diphenylsiloxy%trimethicone%'
    OR inci_name ILIKE '%diphenylsiloxy phenyl%'
);

-- pass 3: saccharomyces
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%saccharomyces%'
);

-- pass 3: C-alkanes / pareth
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'c15-19 alkane%'
    OR inci_name ILIKE 'c9-12 alkane%'
    OR inci_name ILIKE 'c9-11 pareth%'
);

-- pass 3: oleic acid
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'oleic acid%'
);

-- pass 3: tocopherylacetate
UPDATE ingredients SET primary_function = 'antioxidant'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'tocopherylacetate%'
);

-- pass 3: polyimide
UPDATE ingredients SET primary_function = 'film_former'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'polyimide%'
);

-- pass 3: chlorhexidine
UPDATE ingredients SET primary_function = 'preservative'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%chlorhexidine%'
);

-- pass 3: peg-60 almond glycerides
UPDATE ingredients SET primary_function = 'emulsifier'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%peg-60 almond%'
    OR inci_name ILIKE '%almond glycerides%'
);

-- pass 3: albumen
UPDATE ingredients SET primary_function = 'protein'
WHERE primary_function IS NULL AND (
    inci_name ILIKE 'albumen%'
);

-- pass 3: dimer dilinoleate
UPDATE ingredients SET primary_function = 'emollient'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%dimer dilinoleyl%'
    OR inci_name ILIKE '%dilinoleate%'
);

-- pass 3: lamium album
UPDATE ingredients SET primary_function = 'scalp_active'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%lamium album%'
    OR inci_name ILIKE '%white nettle%'
);

-- pass 3: rhizobian gum
UPDATE ingredients SET primary_function = 'thickener'
WHERE primary_function IS NULL AND (
    inci_name ILIKE '%rhizobian%'
);

