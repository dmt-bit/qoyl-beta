-- Ingredients 51-100 requested for the compatibility_scores expansion.
-- 25 of the 50 requested were already in the live table or in the two
-- pending (uncommitted) seed_compatibility_scores_4/5.sql files, and
-- were skipped: Cocamidopropyl Betaine, Polyquaternium-10, Polyquaternium-37,
-- Cetrimonium Chloride, Behentrimonium Methosulfate, PEG-40 Hydrogenated
-- Castor Oil, Hydrolyzed Wheat Protein, Hydrolyzed Keratin, Hydrolyzed
-- Collagen, Hydrolyzed Silk, Hydrolyzed Rice Protein, Sodium Hydroxide,
-- Tocopherol, Tocopheryl Acetate, Panthenol, Biotin, Helianthus Annuus
-- Seed Oil, Linum Usitatissimum Oil, Mauritia Flexuosa Fruit Oil, Argania
-- Spinosa Kernel Oil, Cocos Nucifera Oil, Persea Gratissima Oil, and Salvia
-- Officinalis Leaf Extract. Rosmarinus Officinalis Flower/Leaf/Stem Extract
-- and Equisetum Arvense Leaf Extract were treated as near-duplicates of the
-- already-pending Rosemary Extract and Horsetail Extract entries and were
-- also skipped. Peppermint Leaf Extract and Lavender Flower Extract were
-- kept as distinct from the pending Peppermint/Lavender Oil entries, since
-- extract and essential-oil forms have meaningfully different properties.
--
-- Calendula, Chamomile, and Arnica get extra scalp_condition-specific rows
-- alongside their base porosity rows, matching the existing Fragrance/DMDM
-- Hydantoin pattern already in the table.

insert into ingredients (id, inci_name, common_name) values
  ('7b94a431-38d1-48e3-8152-465f7ebd3a92', 'Sodium C14-16 Olefin Sulfonate', 'Sodium Olefin Sulfonate'),
  ('fe31af0d-9fdd-4407-af6d-c084671f4f0e', 'Sodium Cocoyl Isethionate', 'SCI'),
  ('13882863-cbeb-4016-9fc8-420a34942aa0', 'Guar Hydroxypropyltrimonium Chloride', 'Cationic Guar Gum'),
  ('08499fc9-69c4-46e0-ba84-b8cd24885436', 'Polyquaternium-55', 'PQ-55'),
  ('7cf39200-9492-4328-8ac7-84b24db8eeba', 'PEG-100 Stearate', 'PEG-100 Stearate'),
  ('cb5f484c-b51a-4a5b-9228-5283cf5ce72f', 'Glycol Distearate', 'Glycol Distearate'),
  ('8a805291-afda-4e42-ab1b-0c522526509e', 'Sodium PCA', 'Sodium PCA'),
  ('868ca970-9642-441f-ae59-c14d5cad19f9', 'Lactic Acid', 'Lactic Acid'),
  ('1147ab40-0d33-4dfd-bed6-75b44d72a793', 'Aminomethyl Propanol', 'AMP'),
  ('4b796e5c-1044-401d-8e18-356e54e8a95b', 'Potassium Hydroxide', 'Potassium Hydroxide'),
  ('d3c00f63-06d9-45e3-8878-d00217fe8cd0', 'Ascorbic Acid', 'Vitamin C'),
  ('8c24ec69-f2f6-4504-a62b-96bbfef76fb1', 'Niacinamide', 'Vitamin B3'),
  ('781c5fc7-9c0c-4d10-a64b-fce16b37adf4', 'Inositol', 'Inositol'),
  ('842a6db7-33dc-497e-b639-4ff4cf402616', 'Caffeine', 'Caffeine'),
  ('d4101eee-bd50-438b-87d5-cb7cd7f47098', 'Ginger Root Extract', 'Ginger Extract'),
  ('e3f205a7-2501-4d87-9659-c8afbebef25c', 'Camellia Oleifera Seed Oil', 'Tea Seed Oil'),
  ('c8eee84b-9010-4052-be65-76f750b3436e', 'Carthamus Tinctorius Seed Oil', 'Safflower Oil'),
  ('e382d436-79d0-4769-95a9-7836f66f104d', 'Hibiscus Rosa-Sinensis Flower Extract', 'Hibiscus Extract'),
  ('ee88dbd7-ec12-4043-b17f-6c83b2445c0d', 'Lavandula Angustifolia Flower Extract', 'Lavender Flower Extract'),
  ('85468ea0-95f1-478c-9f55-e68e1bc2bb37', 'Passiflora Edulis Oil', 'Passion Fruit Oil'),
  ('5aa4e574-d54b-4f75-91ee-389f1c039982', 'Leuconostoc/Radish Root Ferment Filtrate', 'Radish Root Ferment Filtrate'),
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'Mentha Piperita Leaf Extract', 'Peppermint Leaf Extract'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'Calendula Officinalis Flower Extract', 'Calendula Extract'),
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'Chamomilla Recutita Flower Extract', 'Chamomile Extract'),
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'Arnica Montana Flower Extract', 'Arnica Extract')
on conflict do nothing;

insert into compatibility_scores (ingredient_id, porosity, scalp_condition, score, rating, reason) values
  -- Sodium Olefin Sulfonate
  ('7b94a431-38d1-48e3-8152-465f7ebd3a92', 'low', null, 4, 'caution', 'Strong surfactant can strip natural oils and moisture from tight, resistant cuticles.'),
  ('7b94a431-38d1-48e3-8152-465f7ebd3a92', 'medium', null, 5, 'neutral', 'Moderate cleansing strength; generally tolerated.'),
  ('7b94a431-38d1-48e3-8152-465f7ebd3a92', 'high', null, 6, 'neutral', 'Effective at removing buildup; better tolerated on already-porous strands.'),
  -- SCI
  ('fe31af0d-9fdd-4407-af6d-c084671f4f0e', 'low', null, 8, 'good', 'Ultra-mild, coconut-derived cleanser that doesn''t strip moisture.'),
  ('fe31af0d-9fdd-4407-af6d-c084671f4f0e', 'medium', null, 8, 'good', 'Gentle, non-stripping cleansing across most hair types.'),
  ('fe31af0d-9fdd-4407-af6d-c084671f4f0e', 'high', null, 8, 'good', 'Cleans gently without exacerbating dryness in gappy cuticles.'),
  -- Cationic Guar Gum
  ('13882863-cbeb-4016-9fc8-420a34942aa0', 'low', null, 8, 'good', 'Lightweight conditioning polymer detangles without heavy buildup.'),
  ('13882863-cbeb-4016-9fc8-420a34942aa0', 'medium', null, 8, 'good', 'Gentle conditioning and detangling with low buildup risk.'),
  ('13882863-cbeb-4016-9fc8-420a34942aa0', 'high', null, 8, 'good', 'Detangles gappy cuticles without adding heaviness.'),
  -- PQ-55
  ('08499fc9-69c4-46e0-ba84-b8cd24885436', 'low', null, 4, 'caution', 'Film-forming polymer can build up on tight, resistant cuticles.'),
  ('08499fc9-69c4-46e0-ba84-b8cd24885436', 'medium', null, 5, 'neutral', 'Moderate buildup risk; manageable with regular clarifying.'),
  ('08499fc9-69c4-46e0-ba84-b8cd24885436', 'high', null, 5, 'neutral', 'Open cuticles shed buildup more easily.'),
  -- PEG-100 Stearate
  ('7cf39200-9492-4328-8ac7-84b24db8eeba', 'low', null, 5, 'neutral', 'Mild emulsifier with little direct conditioning effect.'),
  ('7cf39200-9492-4328-8ac7-84b24db8eeba', 'medium', null, 5, 'neutral', 'Functions mainly to stabilize the formula; minimal porosity-specific impact.'),
  ('7cf39200-9492-4328-8ac7-84b24db8eeba', 'high', null, 5, 'neutral', 'Minimal direct effect on hair; primarily a formulation aid.'),
  -- Glycol Distearate
  ('cb5f484c-b51a-4a5b-9228-5283cf5ce72f', 'low', null, 5, 'neutral', 'Opacifier that gives a pearly appearance; no direct hair benefit or harm.'),
  ('cb5f484c-b51a-4a5b-9228-5283cf5ce72f', 'medium', null, 5, 'neutral', 'Cosmetic opacifier with no notable direct effect on hair.'),
  ('cb5f484c-b51a-4a5b-9228-5283cf5ce72f', 'high', null, 5, 'neutral', 'Cosmetic opacifier with no notable direct effect on hair.'),
  -- Sodium PCA
  ('8a805291-afda-4e42-ab1b-0c522526509e', 'low', null, 8, 'good', 'Naturally occurring humectant hydrates tight cuticles without heaviness.'),
  ('8a805291-afda-4e42-ab1b-0c522526509e', 'medium', null, 8, 'good', 'Draws and holds moisture with low buildup risk.'),
  ('8a805291-afda-4e42-ab1b-0c522526509e', 'high', null, 7, 'good', 'Helps draw and hold moisture in gappy, high porosity cuticles.'),
  -- Lactic Acid
  ('868ca970-9642-441f-ae59-c14d5cad19f9', 'low', null, 8, 'good', 'Mild AHA clarifies the scalp and helps balance pH without stripping.'),
  ('868ca970-9642-441f-ae59-c14d5cad19f9', 'medium', null, 8, 'good', 'Balances scalp pH and gently clarifies.'),
  ('868ca970-9642-441f-ae59-c14d5cad19f9', 'high', null, 7, 'good', 'Balances pH, which can help temporarily tighten raised, gappy cuticles.'),
  -- AMP
  ('1147ab40-0d33-4dfd-bed6-75b44d72a793', 'low', null, 5, 'neutral', 'Standard pH adjuster with no notable direct effect on hair.'),
  ('1147ab40-0d33-4dfd-bed6-75b44d72a793', 'medium', null, 5, 'neutral', 'Standard pH adjuster with no notable direct effect on hair.'),
  ('1147ab40-0d33-4dfd-bed6-75b44d72a793', 'high', null, 5, 'neutral', 'Standard pH adjuster with no notable direct effect on hair.'),
  -- Potassium Hydroxide
  ('4b796e5c-1044-401d-8e18-356e54e8a95b', 'low', null, 5, 'neutral', 'Used in trace amounts as a pH adjuster; minimal direct effect on hair at this concentration.'),
  ('4b796e5c-1044-401d-8e18-356e54e8a95b', 'medium', null, 5, 'neutral', 'Used in trace amounts as a pH adjuster; minimal direct effect on hair at this concentration.'),
  ('4b796e5c-1044-401d-8e18-356e54e8a95b', 'high', null, 5, 'neutral', 'Used in trace amounts as a pH adjuster; minimal direct effect on hair at this concentration.'),
  -- Vitamin C
  ('d3c00f63-06d9-45e3-8878-d00217fe8cd0', 'low', null, 5, 'neutral', 'Antioxidant and pH adjuster; unstable in formulas, so benefit is inconsistent.'),
  ('d3c00f63-06d9-45e3-8878-d00217fe8cd0', 'medium', null, 5, 'neutral', 'Antioxidant and pH adjuster; unstable in formulas, so benefit is inconsistent.'),
  ('d3c00f63-06d9-45e3-8878-d00217fe8cd0', 'high', null, 5, 'neutral', 'Antioxidant and pH adjuster; unstable in formulas, so benefit is inconsistent.'),
  -- Vitamin B3
  ('8c24ec69-f2f6-4504-a62b-96bbfef76fb1', 'low', null, 8, 'good', 'Strengthens the hair shaft and reduces breakage without buildup.'),
  ('8c24ec69-f2f6-4504-a62b-96bbfef76fb1', 'medium', null, 8, 'good', 'Strengthens strand and supports scalp health.'),
  ('8c24ec69-f2f6-4504-a62b-96bbfef76fb1', 'high', null, 8, 'good', 'Reduces breakage in fragile, gappy cuticles without adding heaviness.'),
  -- Inositol
  ('781c5fc7-9c0c-4d10-a64b-fce16b37adf4', 'low', null, 8, 'good', 'Strengthens the hair shaft and reduces breakage without buildup.'),
  ('781c5fc7-9c0c-4d10-a64b-fce16b37adf4', 'medium', null, 8, 'good', 'Strengthens strand and reduces breakage.'),
  ('781c5fc7-9c0c-4d10-a64b-fce16b37adf4', 'high', null, 8, 'good', 'Strengthens fragile, gappy cuticles without adding heaviness.'),
  -- Caffeine
  ('842a6db7-33dc-497e-b639-4ff4cf402616', 'low', null, 8, 'good', 'Stimulates hair follicles and promotes growth without buildup.'),
  ('842a6db7-33dc-497e-b639-4ff4cf402616', 'medium', null, 8, 'good', 'Stimulates follicles and supports healthy growth.'),
  ('842a6db7-33dc-497e-b639-4ff4cf402616', 'high', null, 8, 'good', 'Stimulates follicles without adding heaviness.'),
  -- Ginger Extract
  ('d4101eee-bd50-438b-87d5-cb7cd7f47098', 'low', null, 8, 'good', 'Stimulates scalp circulation and reduces inflammation without buildup.'),
  ('d4101eee-bd50-438b-87d5-cb7cd7f47098', 'medium', null, 8, 'good', 'Stimulates circulation and reduces scalp inflammation.'),
  ('d4101eee-bd50-438b-87d5-cb7cd7f47098', 'high', null, 8, 'good', 'Stimulates scalp without adding heaviness.'),
  -- Tea Seed Oil
  ('e3f205a7-2501-4d87-9659-c8afbebef25c', 'low', null, 9, 'good', 'Very lightweight, high-oleic oil penetrates well without heaviness.'),
  ('e3f205a7-2501-4d87-9659-c8afbebef25c', 'medium', null, 8, 'good', 'Lightweight, penetrating conditioning with low buildup risk.'),
  ('e3f205a7-2501-4d87-9659-c8afbebef25c', 'high', null, 6, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Safflower Oil
  ('c8eee84b-9010-4052-be65-76f750b3436e', 'low', null, 9, 'good', 'Very lightweight oil high in linoleic acid absorbs without heaviness.'),
  ('c8eee84b-9010-4052-be65-76f750b3436e', 'medium', null, 7, 'good', 'Lightweight conditioning with low buildup risk.'),
  ('c8eee84b-9010-4052-be65-76f750b3436e', 'high', null, 5, 'neutral', 'Beneficial but less essential since high porosity hair already absorbs moisture readily.'),
  -- Hibiscus Extract
  ('e382d436-79d0-4769-95a9-7836f66f104d', 'low', null, 8, 'good', 'Natural AHA aids detangling and growth without buildup.'),
  ('e382d436-79d0-4769-95a9-7836f66f104d', 'medium', null, 8, 'good', 'Aids detangling and supports growth.'),
  ('e382d436-79d0-4769-95a9-7836f66f104d', 'high', null, 8, 'good', 'Aids detangling without adding heaviness.'),
  -- Lavender Flower Extract
  ('ee88dbd7-ec12-4043-b17f-6c83b2445c0d', 'low', null, 8, 'good', 'Gentle, water-based extract soothes the scalp without buildup.'),
  ('ee88dbd7-ec12-4043-b17f-6c83b2445c0d', 'medium', null, 8, 'good', 'Soothes scalp with mild antimicrobial benefit.'),
  ('ee88dbd7-ec12-4043-b17f-6c83b2445c0d', 'high', null, 8, 'good', 'Soothes scalp without adding heaviness.'),
  -- Passion Fruit Oil
  ('85468ea0-95f1-478c-9f55-e68e1bc2bb37', 'low', null, 8, 'good', 'Lightweight oil high in linoleic acid absorbs without heaviness.'),
  ('85468ea0-95f1-478c-9f55-e68e1bc2bb37', 'medium', null, 8, 'good', 'Lightweight, antioxidant-rich conditioning.'),
  ('85468ea0-95f1-478c-9f55-e68e1bc2bb37', 'high', null, 8, 'good', 'Lightweight conditioning without adding heaviness.'),
  -- Radish Root Ferment Filtrate
  ('5aa4e574-d54b-4f75-91ee-389f1c039982', 'low', null, 8, 'good', 'Gentle, natural preservative with no notable direct effect on hair beyond formula stability.'),
  ('5aa4e574-d54b-4f75-91ee-389f1c039982', 'medium', null, 8, 'good', 'Gentle, microbiome-friendly preservative system.'),
  ('5aa4e574-d54b-4f75-91ee-389f1c039982', 'high', null, 8, 'good', 'Gentle preservative with no notable direct effect on hair.'),
  -- Peppermint Leaf Extract
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'low', null, 7, 'good', 'Mild, extract-form scalp stimulant; gentler than essential oil formulations.'),
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'medium', null, 7, 'good', 'Mild scalp stimulant with cooling sensation; gentler than essential oil.'),
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'high', null, 7, 'good', 'Mild scalp stimulant without adding heaviness.'),
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'low', 'sensitive', 4, 'caution', 'Milder than peppermint oil, but menthol-containing extracts can still irritate sensitive scalps.'),
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'medium', 'sensitive', 4, 'caution', 'Milder than peppermint oil, but menthol-containing extracts can still irritate sensitive scalps.'),
  ('5d79c089-696d-4d3e-8230-8c6dc072fd69', 'high', 'sensitive', 4, 'caution', 'Milder than peppermint oil, but menthol-containing extracts can still irritate sensitive scalps.'),
  -- Calendula Extract
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'low', null, 6, 'neutral', 'Gentle anti-inflammatory extract with general soothing benefit; especially beneficial for sensitive or dry scalp specifically.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'medium', null, 6, 'neutral', 'General soothing benefit; especially beneficial for sensitive or dry scalp specifically.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'high', null, 6, 'neutral', 'General soothing benefit; especially beneficial for sensitive or dry scalp specifically.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'low', 'sensitive', 8, 'good', 'Anti-inflammatory properties are particularly soothing for reactive, sensitive scalps.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'medium', 'sensitive', 8, 'good', 'Anti-inflammatory properties are particularly soothing for reactive, sensitive scalps.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'high', 'sensitive', 8, 'good', 'Anti-inflammatory properties are particularly soothing for reactive, sensitive scalps.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'low', 'dry', 8, 'good', 'Soothing, moisturizing extract benefits dry, tight scalps.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'medium', 'dry', 8, 'good', 'Soothing, moisturizing extract benefits dry, tight scalps.'),
  ('a83325f4-c129-4c11-92ba-5e03178d0289', 'high', 'dry', 8, 'good', 'Soothing, moisturizing extract benefits dry, tight scalps.'),
  -- Chamomile Extract
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'low', null, 6, 'neutral', 'Mild general soothing benefit; especially beneficial for sensitive scalp specifically.'),
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'medium', null, 6, 'neutral', 'Mild general soothing benefit; especially beneficial for sensitive scalp specifically.'),
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'high', null, 6, 'neutral', 'Mild general soothing benefit; especially beneficial for sensitive scalp specifically.'),
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'low', 'sensitive', 8, 'good', 'Classic soothing, anti-inflammatory extract well suited to reactive, sensitive scalps.'),
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'medium', 'sensitive', 8, 'good', 'Classic soothing, anti-inflammatory extract well suited to reactive, sensitive scalps.'),
  ('5a7aa25b-7b4f-45e8-94d3-f327d76a9d77', 'high', 'sensitive', 8, 'good', 'Classic soothing, anti-inflammatory extract well suited to reactive, sensitive scalps.'),
  -- Arnica Extract
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'low', null, 7, 'good', 'Anti-inflammatory extract well tolerated on normal scalp.'),
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'medium', null, 7, 'good', 'Anti-inflammatory extract well tolerated on normal scalp.'),
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'high', null, 7, 'good', 'Anti-inflammatory extract well tolerated on normal scalp.'),
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'low', 'sensitive', 3, 'caution', 'Can irritate already-reactive, sensitive scalps despite its anti-inflammatory reputation.'),
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'medium', 'sensitive', 3, 'caution', 'Can irritate already-reactive, sensitive scalps despite its anti-inflammatory reputation.'),
  ('4aa0a3ad-6b6f-4c9a-afe6-b5d1a8aa080c', 'high', 'sensitive', 3, 'caution', 'Can irritate already-reactive, sensitive scalps despite its anti-inflammatory reputation.')
on conflict do nothing;
