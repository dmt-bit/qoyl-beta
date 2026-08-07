-- Camille Rose top-10 product seed (catalog_products + catalog_product_ingredients).
-- Generated from the rows actually inserted by running the 10 products through
-- the real /admin/products API (which does the real ingredient/alias matching) --
-- this file is a reproducible record of that run, not hand-written matching logic.

-- New ingredients that had no match in ingredients or aliases (created once,
-- reused across every product that lists them). Ceteareth-20/25 were initially
-- mismatched to Triethanolamine (common_name "TEA", which is a substring of
-- "ceTEAreth-25") by the ingredient matcher's substring-containment tier -- fixed
-- in lib/compatibility.ts (minimum length guard) and corrected here.
insert into ingredients (inci_name, common_name)
select 'Aniseed Oil', null
where not exists (
  select 1 from ingredients where lower(inci_name) = 'aniseed oil'
);

insert into ingredients (inci_name, common_name)
select 'Methyl Gluceth-20', null
where not exists (
  select 1 from ingredients where lower(inci_name) = 'methyl gluceth-20'
);

insert into ingredients (inci_name, common_name)
select 'Oleth-20', null
where not exists (
  select 1 from ingredients where lower(inci_name) = 'oleth-20'
);

insert into ingredients (inci_name, common_name)
select 'Ceteareth-20', null
where not exists (
  select 1 from ingredients where lower(inci_name) = 'ceteareth-20'
);

insert into ingredients (inci_name, common_name)
select 'Ceteareth-25', null
where not exists (
  select 1 from ingredients where lower(inci_name) = 'ceteareth-25'
);

-- Products
insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'leave-in'),
  'Curl Love Moisture Milk',
  '851557003033',
  '8 oz',
  'manual',
  true,
  'Deionized Water, Behentrimonium Methosulfate, Cetearyl Alcohol, Persea Gratissima (Avocado) Oil, Oryza Sativa (Rice) Bran Oil, Aloe Barbadensis Leaf Juice, Ricinus Communis (Castor) Seed Oil, Macadamia Ternifolia Seed Oil, Sorbitol, Camellia Sinensis (Green Tea) Leaf Extract, Oryza Sativa (Rice) Milk, Rosa Canina (Rosehip) Fruit Oil, Ceteareth-20, Ulmus Fulva (Slippery Elm) Bark Extract, Phenoxyethanol, Caprylyl Glycol, Fragrance',
  array['Deionized Water', 'Behentrimonium Methosulfate', 'Cetearyl Alcohol', 'Persea Gratissima (avocado) Oil', 'Oryza Sativa (rice) Bran Oil', 'Aloe Barbadensis Leaf Juice', 'Ricinus Communis (castor) Seed Oil', 'Macadamia Ternifolia Seed Oil', 'Sorbitol', 'Camellia Sinensis (green Tea) Leaf Extract', 'Oryza Sativa (rice) Milk', 'Rosa Canina (rosehip) Fruit Oil', 'Ceteareth-20', 'Ulmus Fulva (slippery Elm) Bark Extract', 'Phenoxyethanol', 'Caprylyl Glycol', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Curl Love Moisture Milk' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'gel'),
  'Curl Maker',
  '851557003149',
  '12 oz',
  'manual',
  true,
  'Deionized Water, Pectin, Cocos Nucifera (Coconut) Oil, Aloe Barbadensis Leaf Juice, Panthenol, Ricinus Communis (Castor) Seed Oil, Althaea Officinalis (Marshmallow) Leaf/Root Extract, Agave Americana (Agave) Leaf Extract, Equisetum Arvense (Horsetail) Extract, Urtica Dioica (Nettle) Leaf Extract, Hydrolyzed Corn Starch, Xanthan Gum, Chondrus Crispus (Seaweed) Powder, Polysorbate 20, Tocopheryl Acetate, Cyanocobalamin, Phenoxyethanol, Caprylyl Glycol, Fragrance',
  array['Deionized Water', 'Pectin', 'Cocos Nucifera (coconut) Oil', 'Aloe Barbadensis Leaf Juice', 'Panthenol', 'Ricinus Communis (castor) Seed Oil', 'Althaea Officinalis (marshmallow) Leaf/root Extract', 'Agave Americana (agave) Leaf Extract', 'Equisetum Arvense (horsetail) Extract', 'Urtica Dioica (nettle) Leaf Extract', 'Hydrolyzed Corn Starch', 'Xanthan Gum', 'Chondrus Crispus (seaweed) Powder', 'Polysorbate 20', 'Tocopheryl Acetate', 'Cyanocobalamin', 'Phenoxyethanol', 'Caprylyl Glycol', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Curl Maker' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'deep-conditioner'),
  'Algae Renew Deep Conditioner',
  '851557003132',
  '8 oz',
  'manual',
  true,
  'Deionized Water, Aloe Barbadensis Leaf Juice, Butyrospermum Parkii (Shea) Butter, Cocos Nucifera (Coconut) Oil, Behentrimonium Methosulfate, Cetyl Alcohol, Theobroma Cacao (Cocoa) Seed Butter, Mangifera Indica (Mango) Seed Butter, Cannabis Sativa (Hemp) Seed Oil, Panthenol, Mel (Honey), Vegetable Glycerin, Camellia Sinensis (Green Tea) Leaf Extract, Simmondsia Chinensis (Jojoba) Seed Oil, Rosa Canina (Rosehip) Fruit Oil, Vitis Vinifera (Grape) Seed Oil, Oenothera Biennis (Evening Primrose) Oil, Phenoxyethanol, Caprylyl Glycol, Blue Green Algae, Biotin, MSM, Tocopheryl Acetate, Mentha Piperita (Peppermint) Oil, Fragrance',
  array['Deionized Water', 'Aloe Barbadensis Leaf Juice', 'Butyrospermum Parkii (shea) Butter', 'Cocos Nucifera (coconut) Oil', 'Behentrimonium Methosulfate', 'Cetyl Alcohol', 'Theobroma Cacao (cocoa) Seed Butter', 'Mangifera Indica (mango) Seed Butter', 'Cannabis Sativa (hemp) Seed Oil', 'Panthenol', 'Mel (honey)', 'Vegetable Glycerin', 'Camellia Sinensis (green Tea) Leaf Extract', 'Simmondsia Chinensis (jojoba) Seed Oil', 'Rosa Canina (rosehip) Fruit Oil', 'Vitis Vinifera (grape) Seed Oil', 'Oenothera Biennis (evening Primrose) Oil', 'Phenoxyethanol', 'Caprylyl Glycol', 'Blue Green Algae', 'Biotin', 'MSM', 'Tocopheryl Acetate', 'Mentha Piperita (peppermint) Oil', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Algae Renew Deep Conditioner' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'styler'),
  'Almond Jai Twisting Butter',
  '851557003080',
  '8 oz',
  'manual',
  true,
  'Deionized Water, Behentrimonium Methosulfate, Cetearyl Alcohol, Prunus Amygdalus Dulcis Fruit Extract, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Cucurbita Pepo (Pumpkin) Seed Oil, Sesamum Indicum (Sesame) Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Oryza Sativa (Rice) Bran Oil, Macadamia Ternifolia Seed Oil, Olea Europaea (Olive) Fruit Oil, Cannabis Sativa (Hemp) Seed Oil, Ulmus Fulva Bark (Slippery Elm) Extract, Ricinus Communis (Castor) Seed Oil, Aloe Barbadensis Leaf Juice, Camellia Sinensis (Green Tea) Leaf Extract, Mel (Honey), Phenoxyethanol, Caprylyl Glycol, Fragrance',
  array['Deionized Water', 'Behentrimonium Methosulfate', 'Cetearyl Alcohol', 'Prunus Amygdalus Dulcis Fruit Extract', 'Prunus Amygdalus Dulcis (sweet Almond) Oil', 'Cucurbita Pepo (pumpkin) Seed Oil', 'Sesamum Indicum (sesame) Seed Oil', 'Simmondsia Chinensis (jojoba) Seed Oil', 'Oryza Sativa (rice) Bran Oil', 'Macadamia Ternifolia Seed Oil', 'Olea Europaea (olive) Fruit Oil', 'Cannabis Sativa (hemp) Seed Oil', 'Ulmus Fulva Bark (slippery Elm) Extract', 'Ricinus Communis (castor) Seed Oil', 'Aloe Barbadensis Leaf Juice', 'Camellia Sinensis (green Tea) Leaf Extract', 'Mel (honey)', 'Phenoxyethanol', 'Caprylyl Glycol', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Almond Jai Twisting Butter' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'shampoo'),
  'Sweet Ginger Cleansing Rinse',
  '851557003354',
  '12 oz',
  'manual',
  true,
  'Water, Ginger Root Oil Infused, Disodium Cocoamphodipropionate, Sodium C14-16 Olefin Sulfonate, Cocamidopropyl Betaine, Citric Acid, Aniseed Oil, Ricinus Communis (Castor) Seed Oil, Polyquaternium-10, Glycol Distearate, Sodium Cocoyl Isethionate, Guar Chloride, Phenoxyethanol, Caprylyl Glycol, Fragrance',
  array['Water', 'Ginger Root Oil Infused', 'Disodium Cocoamphodipropionate', 'Sodium C14-16 Olefin Sulfonate', 'Cocamidopropyl Betaine', 'Citric Acid', 'Aniseed Oil', 'Ricinus Communis (castor) Seed Oil', 'Polyquaternium-10', 'Glycol Distearate', 'Sodium Cocoyl Isethionate', 'Guar Chloride', 'Phenoxyethanol', 'Caprylyl Glycol', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Sweet Ginger Cleansing Rinse' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'mousse'),
  'Spiked Honey Mousse 4-in-1 Styler',
  null,
  '8 oz',
  'manual',
  true,
  'Water, Oryza Sativa (Rice Water) Extract, Honey, Urtica Dioica (Nettle) Extract, Cocamidopropyl Betaine, Polyquaternium-55, Polysorbate 20, PVP, Methyl Gluceth-20, Oleth-20, Phenoxyethanol, Caprylyl Glycol, Fragrance',
  array['Water', 'Oryza Sativa (rice Water) Extract', 'Honey', 'Urtica Dioica (nettle) Extract', 'Cocamidopropyl Betaine', 'Polyquaternium-55', 'Polysorbate 20', 'PVP', 'Methyl Gluceth-20', 'Oleth-20', 'Phenoxyethanol', 'Caprylyl Glycol', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Spiked Honey Mousse 4-in-1 Styler' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'treatment'),
  'Rosemary Water Daily Strengthening Mist',
  null,
  '8 oz',
  'manual',
  true,
  'Water, Aloe Barbadensis Leaf Juice, Glycerin, Polysorbate 20, Cetrimonium Chloride, Rosmarinus Officinalis (Rosemary) Leaf Oil, Urtica Dioica (Nettle) Leaf Extract, Melissa Officinalis (Melissa) Leaf Extract, Mentha Piperita (Peppermint) Leaf Extract, Equisetum Arvense (Horsetail) Leaf Extract, Yucca Leaf Extract, Rosmarinus Officinalis (Rosemary) Flower/Leaf/Stem Extract, Ricinus Communis (Castor) Seed Oil, Mentha Piperita (Peppermint) Oil, Polyquaternium-37, Phenoxyethanol, Ethylhexylglycerin, Fragrance',
  array['Water', 'Aloe Barbadensis Leaf Juice', 'Glycerin', 'Polysorbate 20', 'Cetrimonium Chloride', 'Rosmarinus Officinalis (rosemary) Leaf Oil', 'Urtica Dioica (nettle) Leaf Extract', 'Melissa Officinalis (melissa) Leaf Extract', 'Mentha Piperita (peppermint) Leaf Extract', 'Equisetum Arvense (horsetail) Leaf Extract', 'Yucca Leaf Extract', 'Rosmarinus Officinalis (rosemary) Flower/leaf/stem Extract', 'Ricinus Communis (castor) Seed Oil', 'Mentha Piperita (peppermint) Oil', 'Polyquaternium-37', 'Phenoxyethanol', 'Ethylhexylglycerin', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Rosemary Water Daily Strengthening Mist' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'oil'),
  'Rosemary Oil Strengthening Hair and Scalp Drops',
  null,
  '1.9 oz',
  'manual',
  true,
  'Ricinus Communis (Castor) Seed Oil, Olea Europaea (Olive) Fruit Oil, Rosmarinus Officinalis (Rosemary) Leaf Oil, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Menthol, Rosmarinus Officinalis (Rosemary) Flower/Leaf/Stem Extract, Ethylhexyl Palmitate, Oenothera Biennis (Evening Primrose) Root Extract, Emblica Officinalis (Amla) Fruit Extract, Acacia Concinna (Shikakai) Fruit Extract, Lavandula Angustifolia (Lavender) Oil, Pogostemon Cablin (Patchouli) Oil, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Rosa Canina (Rosehip) Seed Oil, Vitis Vinifera (Grape) Seed Oil, Mentha Piperita (Peppermint) Oil',
  array['Ricinus Communis (castor) Seed Oil', 'Olea Europaea (olive) Fruit Oil', 'Rosmarinus Officinalis (rosemary) Leaf Oil', 'Melaleuca Alternifolia (tea Tree) Leaf Oil', 'Menthol', 'Rosmarinus Officinalis (rosemary) Flower/leaf/stem Extract', 'Ethylhexyl Palmitate', 'Oenothera Biennis (evening Primrose) Root Extract', 'Emblica Officinalis (amla) Fruit Extract', 'Acacia Concinna (shikakai) Fruit Extract', 'Lavandula Angustifolia (lavender) Oil', 'Pogostemon Cablin (patchouli) Oil', 'Prunus Amygdalus Dulcis (sweet Almond) Oil', 'Rosa Canina (rosehip) Seed Oil', 'Vitis Vinifera (grape) Seed Oil', 'Mentha Piperita (peppermint) Oil']::text[]
where not exists (
  select 1 from catalog_products where name = 'Rosemary Oil Strengthening Hair and Scalp Drops' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'scalp-treatment'),
  'Mint Condition Braid and Scalp Spray',
  null,
  '8 oz',
  'manual',
  true,
  'Deionized Water, Aloe Barbadensis Leaf Juice, Simmondsia Chinensis (Jojoba) Seed Oil, Olea Europaea (Olive) Fruit Oil, Polysorbate 20, Cetrimonium Chloride, Mentha Piperita (Peppermint) Oil, Menthol, Chondrus Crispus (Sea Moss) Extract, Ricinus Communis (Castor) Seed Oil, Rubus Idaeus (Raspberry) Leaf Extract, Withania Somnifera (Ashwagandha) Root Extract, Mel (Honey), Melaleuca Alternifolia (Tea Tree) Leaf Oil, Polyquaternium-37, Phenoxyethanol, Ethylhexylglycerin, Fragrance',
  array['Deionized Water', 'Aloe Barbadensis Leaf Juice', 'Simmondsia Chinensis (jojoba) Seed Oil', 'Olea Europaea (olive) Fruit Oil', 'Polysorbate 20', 'Cetrimonium Chloride', 'Mentha Piperita (peppermint) Oil', 'Menthol', 'Chondrus Crispus (sea Moss) Extract', 'Ricinus Communis (castor) Seed Oil', 'Rubus Idaeus (raspberry) Leaf Extract', 'Withania Somnifera (ashwagandha) Root Extract', 'Mel (honey)', 'Melaleuca Alternifolia (tea Tree) Leaf Oil', 'Polyquaternium-37', 'Phenoxyethanol', 'Ethylhexylglycerin', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Mint Condition Braid and Scalp Spray' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

insert into catalog_products (brand_id, category_id, name, barcode, size, source, is_verified, ingredient_list_raw, ingredient_list_normalized)
select
  (select id from catalog_brands where name = 'Camille Rose'),
  (select id from categories where name = 'gel'),
  'Mint Condition Nourishing Braiding Gel',
  null,
  '8 oz',
  'manual',
  true,
  'Water, Ceteareth-25, PEG-7 Glyceryl Cocoate, Glycerin, Chondrus Crispus (Sea Moss) Extract, PEG-40 Hydrogenated Castor Oil, Aloe Barbadensis Leaf Juice, Mentha Piperita (Peppermint) Oil, Hydrolyzed Wheat Protein, Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate, Fragrance',
  array['Water', 'Ceteareth-25', 'PEG-7 Glyceryl Cocoate', 'Glycerin', 'Chondrus Crispus (sea Moss) Extract', 'PEG-40 Hydrogenated Castor Oil', 'Aloe Barbadensis Leaf Juice', 'Mentha Piperita (peppermint) Oil', 'Hydrolyzed Wheat Protein', 'Phenoxyethanol', 'Benzoic Acid', 'Ethylhexylglycerin', 'Glycereth-2 Cocoate', 'Fragrance']::text[]
where not exists (
  select 1 from catalog_products where name = 'Mint Condition Nourishing Braiding Gel' and brand_id = (select id from catalog_brands where name = 'Camille Rose')
);

-- product_ingredients, one statement per product -- ingredient_id resolved by
-- inci_name against the ingredients table at insert time.
insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Curl Love Moisture Milk' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Behentrimonium Methosulfate'),
  (3, 'Cetearyl Alcohol'),
  (4, 'Persea Gratissima Oil'),
  (5, 'Oryza Sativa Bran Oil'),
  (6, 'Aloe Barbadensis Leaf Juice'),
  (7, 'Ricinus Communis Seed Oil'),
  (8, 'Macadamia Ternifolia Seed Oil'),
  (9, 'Sorbitol'),
  (10, 'Camellia Sinensis Leaf Extract'),
  (11, 'Oryza Sativa Milk'),
  (12, 'Rosa Canina Fruit Oil'),
  (13, 'Ceteareth-20'),
  (14, 'Ulmus Fulva Bark Extract'),
  (15, 'Phenoxyethanol'),
  (16, 'Caprylyl Glycol'),
  (17, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Curl Maker' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Pectin'),
  (3, 'Cocos Nucifera Oil'),
  (4, 'Aloe Barbadensis Leaf Juice'),
  (5, 'Panthenol'),
  (6, 'Ricinus Communis Seed Oil'),
  (7, 'Althaea Officinalis Root Extract'),
  (8, 'Agave Americana Leaf Extract'),
  (9, 'Equisetum Arvense Extract'),
  (10, 'Urtica Dioica Leaf Extract'),
  (11, 'Hydrolyzed Corn Starch'),
  (12, 'Xanthan Gum'),
  (13, 'Chondrus Crispus Extract'),
  (14, 'Polysorbate 20'),
  (15, 'Tocopheryl Acetate'),
  (16, 'Cyanocobalamin'),
  (17, 'Phenoxyethanol'),
  (18, 'Caprylyl Glycol'),
  (19, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Algae Renew Deep Conditioner' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Aloe Barbadensis Leaf Juice'),
  (3, 'Butyrospermum Parkii Butter'),
  (4, 'Cocos Nucifera Oil'),
  (5, 'Behentrimonium Methosulfate'),
  (6, 'Cetyl Alcohol'),
  (7, 'Theobroma Cacao Seed Butter'),
  (8, 'Mangifera Indica Seed Butter'),
  (9, 'Cannabis Sativa Seed Oil'),
  (10, 'Panthenol'),
  (11, 'Mel'),
  (12, 'Glycerin'),
  (13, 'Camellia Sinensis Leaf Extract'),
  (14, 'Simmondsia Chinensis Seed Oil'),
  (15, 'Rosa Canina Fruit Oil'),
  (16, 'Vitis Vinifera Seed Oil'),
  (17, 'Oenothera Biennis Oil'),
  (18, 'Phenoxyethanol'),
  (19, 'Caprylyl Glycol'),
  (20, 'Blue Green Algae'),
  (21, 'Biotin'),
  (22, 'Methylsulfonylmethane'),
  (23, 'Tocopheryl Acetate'),
  (24, 'Mentha Piperita Oil'),
  (25, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Almond Jai Twisting Butter' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Behentrimonium Methosulfate'),
  (3, 'Cetearyl Alcohol'),
  (4, 'Prunus Amygdalus Dulcis Oil'),
  (6, 'Cucurbita Pepo Seed Oil'),
  (7, 'Sesamum Indicum Seed Oil'),
  (8, 'Simmondsia Chinensis Seed Oil'),
  (9, 'Oryza Sativa Bran Oil'),
  (10, 'Macadamia Ternifolia Seed Oil'),
  (11, 'Olea Europaea Fruit Oil'),
  (12, 'Cannabis Sativa Seed Oil'),
  (13, 'Ulmus Fulva Bark Extract'),
  (14, 'Ricinus Communis Seed Oil'),
  (15, 'Aloe Barbadensis Leaf Juice'),
  (16, 'Camellia Sinensis Leaf Extract'),
  (17, 'Mel'),
  (18, 'Phenoxyethanol'),
  (19, 'Caprylyl Glycol'),
  (20, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Sweet Ginger Cleansing Rinse' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Ginger Root Extract'),
  (3, 'Disodium Cocoamphodipropionate'),
  (4, 'Sodium C14-16 Olefin Sulfonate'),
  (5, 'Cocamidopropyl Betaine'),
  (6, 'Citric Acid'),
  (7, 'Aniseed Oil'),
  (8, 'Ricinus Communis Seed Oil'),
  (9, 'Polyquaternium-10'),
  (10, 'Glycol Distearate'),
  (11, 'Sodium Cocoyl Isethionate'),
  (12, 'Guar Hydroxypropyltrimonium Chloride'),
  (13, 'Phenoxyethanol'),
  (14, 'Caprylyl Glycol'),
  (15, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Spiked Honey Mousse 4-in-1 Styler' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Oryza Sativa Milk'),
  (3, 'Mel'),
  (4, 'Urtica Dioica Extract'),
  (5, 'Cocamidopropyl Betaine'),
  (6, 'Polyquaternium-55'),
  (7, 'Polysorbate 20'),
  (8, 'PVP'),
  (9, 'Methyl Gluceth-20'),
  (10, 'Oleth-20'),
  (11, 'Phenoxyethanol'),
  (12, 'Caprylyl Glycol'),
  (13, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Rosemary Water Daily Strengthening Mist' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Aloe Barbadensis Leaf Juice'),
  (3, 'Glycerin'),
  (4, 'Polysorbate 20'),
  (5, 'Cetrimonium Chloride'),
  (6, 'Rosmarinus Officinalis Leaf Oil'),
  (7, 'Urtica Dioica Leaf Extract'),
  (8, 'Melissa Officinalis Leaf Extract'),
  (9, 'Mentha Piperita Leaf Extract'),
  (10, 'Equisetum Arvense Extract'),
  (11, 'Yucca Leaf Extract'),
  (12, 'Rosmarinus Officinalis Leaf Extract'),
  (13, 'Ricinus Communis Seed Oil'),
  (14, 'Mentha Piperita Oil'),
  (15, 'Polyquaternium-37'),
  (16, 'Phenoxyethanol'),
  (17, 'Ethylhexylglycerin'),
  (18, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Rosemary Oil Strengthening Hair and Scalp Drops' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Ricinus Communis Seed Oil'),
  (2, 'Olea Europaea Fruit Oil'),
  (3, 'Rosmarinus Officinalis Leaf Oil'),
  (4, 'Melaleuca Alternifolia Leaf Oil'),
  (5, 'Menthol'),
  (6, 'Rosmarinus Officinalis Leaf Extract'),
  (7, 'Ethylhexyl Palmitate'),
  (8, 'Oenothera Biennis Oil'),
  (9, 'Emblica Officinalis Fruit Extract'),
  (10, 'Acacia Concinna Fruit Extract'),
  (11, 'Lavandula Angustifolia Oil'),
  (12, 'Pogostemon Cablin Oil'),
  (13, 'Prunus Amygdalus Dulcis Oil'),
  (14, 'Rosa Canina Fruit Oil'),
  (15, 'Vitis Vinifera Seed Oil'),
  (16, 'Mentha Piperita Oil')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Mint Condition Braid and Scalp Spray' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Aloe Barbadensis Leaf Juice'),
  (3, 'Simmondsia Chinensis Seed Oil'),
  (4, 'Olea Europaea Fruit Oil'),
  (5, 'Polysorbate 20'),
  (6, 'Cetrimonium Chloride'),
  (7, 'Mentha Piperita Oil'),
  (8, 'Menthol'),
  (9, 'Chondrus Crispus Extract'),
  (10, 'Ricinus Communis Seed Oil'),
  (11, 'Rubus Idaeus Leaf Extract'),
  (12, 'Withania Somnifera Root Extract'),
  (13, 'Mel'),
  (14, 'Melaleuca Alternifolia Leaf Oil'),
  (15, 'Polyquaternium-37'),
  (16, 'Phenoxyethanol'),
  (17, 'Ethylhexylglycerin'),
  (18, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

insert into catalog_product_ingredients (product_id, ingredient_id, position)
select
  (select id from catalog_products where name = 'Mint Condition Nourishing Braiding Gel' and brand_id = (select id from catalog_brands where name = 'Camille Rose')),
  ing.id,
  v.position
from (values
  (1, 'Aqua'),
  (2, 'Ceteareth-25'),
  (3, 'PEG-7 Glyceryl Cocoate'),
  (4, 'Glycerin'),
  (5, 'Chondrus Crispus Extract'),
  (6, 'PEG-40 Hydrogenated Castor Oil'),
  (7, 'Aloe Barbadensis Leaf Juice'),
  (8, 'Mentha Piperita Oil'),
  (9, 'Hydrolyzed Wheat Protein'),
  (10, 'Phenoxyethanol'),
  (11, 'Benzoic Acid'),
  (12, 'Ethylhexylglycerin'),
  (13, 'Glycereth-2 Cocoate'),
  (14, 'Parfum')
) as v(position, inci_name)
join ingredients ing on ing.inci_name = v.inci_name
on conflict (product_id, ingredient_id) do nothing;

