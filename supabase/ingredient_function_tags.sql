-- Ingredient function tags, used by the scoring engine's new
-- function-aware modifiers (lib/compatibility.ts) and the ingredient
-- breakdown badge on /search.
alter table ingredients
  add column if not exists primary_function text,
  add column if not exists secondary_function text;

-- Seed tags for the most common ingredients already scored in
-- compatibility_scores. ILIKE ANY(ARRAY[...]) - unchanged from the
-- request, just run as one statement per function.
update ingredients set primary_function = 'humectant'
where inci_name ilike any(array[
  '%glycerin%', '%glycerol%', '%propylene glycol%',
  '%sorbitol%', '%panthenol%', '%aloe%',
  '%honey%', '%sodium pca%', '%hyaluronic acid%'
]);

update ingredients set primary_function = 'protein'
where inci_name ilike any(array[
  '%hydrolyzed%keratin%', '%hydrolyzed%wheat%',
  '%hydrolyzed%silk%', '%hydrolyzed%collagen%',
  '%hydrolyzed%soy%', '%amino acid%',
  '%keratin%', '%peptide%'
]);

update ingredients set primary_function = 'surfactant'
where inci_name ilike any(array[
  '%sulfate%', '%cocamidopropyl betaine%',
  '%sodium cocoyl%', '%decyl glucoside%',
  '%coco glucoside%', '%lauryl%'
]);

update ingredients set primary_function = 'conditioning_agent'
where inci_name ilike any(array[
  '%behentrimonium%', '%cetrimonium%',
  '%quaternium%', '%polyquaternium%',
  '%btms%', '%cetearyl alcohol%'
]);

update ingredients set primary_function = 'occlusive'
where inci_name ilike any(array[
  '%petrolatum%', '%mineral oil%', '%lanolin%',
  '%beeswax%', '%carnauba%', '%dimethicone%',
  '%silicone%', '%cyclomethicone%'
]);

update ingredients set primary_function = 'emollient'
where inci_name ilike any(array[
  '%shea%', '%jojoba%', '%argan%', '%castor%',
  '%coconut oil%', '%olive%', '%avocado%',
  '%grapeseed%', '%sweet almond%'
]);

update ingredients set primary_function = 'chelating_agent'
where inci_name ilike any(array[
  '%edta%', '%sodium phytate%', '%citric acid%',
  '%sodium gluconate%', '%phytic acid%'
]);

update ingredients set primary_function = 'bond_builder'
where inci_name ilike any(array[
  '%bis-aminopropyl%', '%maleic acid%',
  '%crotonyl%', '%glyoxylic%'
]);

update ingredients set primary_function = 'scalp_active'
where inci_name ilike any(array[
  '%rosmarinus officinalis%', '%rosemary%',
  '%caffeine%', '%saw palmetto%',
  '%pumpkin seed%', '%biotin%',
  '%zinc pyrithione%', '%selenium sulfide%',
  '%salicylic acid%', '%piroctone olamine%'
]);
