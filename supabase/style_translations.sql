-- Hair-type-aware style translations: the same detected style (e.g.
-- "Beach Waves") produces different technique/product/tool guidance
-- depending on the viewer's hair family. style_slug references
-- styles(slug) - beach-waves, wash-and-go, and silk-press already
-- exist in that table (beach-waves and wash-and-go from earlier work
-- this session, silk-press pre-existing), so the FK resolves cleanly.
CREATE TABLE style_translations (
  id uuid primary key default gen_random_uuid(),
  style_slug text not null references styles(slug),
  hair_family text not null check (hair_family in (
    'straight', 'wavy', 'curly', 'coily', 'extensions'
  )),
  translation_headline text not null,
  how_to_achieve text not null,
  key_difference text not null,
  products_needed text[],
  tools_needed text[],
  youtube_search_override text,
  difficulty_for_family text check (difficulty_for_family in (
    'beginner','intermediate','advanced'
  )),
  time_estimate text,
  heat_required boolean default false,
  fake_hair_required boolean default false,
  created_at timestamptz default now(),
  UNIQUE(style_slug, hair_family)
);

-- BEACH WAVES
INSERT INTO style_translations
(style_slug, hair_family, translation_headline,
 how_to_achieve, key_difference, products_needed,
 tools_needed, youtube_search_override,
 difficulty_for_family, time_estimate,
 heat_required, fake_hair_required) VALUES

('beach-waves', 'straight',
 'Adding texture to hair that has none',
 'Your hair has no natural wave pattern so beach waves are achieved with heat tools or overnight braids. Curling iron method: section damp heat-protected hair and wrap around a 1.25 inch barrel, alternating directions. Let cool fully before touching. Braid method: braid damp hair in large sections overnight, unravel in the morning and separate with fingers.',
 'Straight hair cannot hold waves without heat or setting — the waves will drop within hours without the right products. Use a texturizing spray before curling and a light hold spray after to extend longevity.',
 ARRAY['heat-protectant','texturizing-spray','light-hold-spray','finishing-serum'],
 ARRAY['curling iron 1.25 inch barrel','wide tooth comb','heat protectant spray'],
 'beach waves tutorial straight fine hair curling iron',
 'beginner', '20-40 minutes', true, false),

('beach-waves', 'wavy',
 'Enhancing what is already there',
 'Wavy hair already has the foundation for beach waves — the goal is definition and separation without frizz. Apply a curl cream or light mousse to soaking wet hair, scrunch upward, diffuse on low heat or air dry. Once fully dry scrunch to break the cast. Salt spray on second-day hair revives the wave pattern.',
 'Unlike straight hair you are working with your natural texture not against it. The key is soaking wet application and not touching while drying.',
 ARRAY['curl-cream','mousse','leave-in','salt-spray'],
 ARRAY['diffuser attachment','microfiber towel'],
 'beach waves wavy hair 2b 2c no heat diffuser',
 'beginner', '15-30 minutes', false, false),

('beach-waves', 'curly',
 'Elongating and loosening your natural curl',
 'Curly hair achieves beach waves through a braid out or twist out on stretched hair. Blow dry on low heat with a tension brush to stretch curls, then braid in large sections and unravel after drying. The result is a looser elongated wave pattern. Alternatively a finger coil method on stretched hair gives definition without full straightening.',
 'The challenge is shrinkage — beach waves on curly hair require some form of stretching first. Without stretching the style will look more like a defined curl than a wave.',
 ARRAY['blow-dry-cream','light-hold-gel','oil'],
 ARRAY['blow dryer with tension brush attachment','large barrel curling iron (optional)'],
 'beach waves curly hair 3b 3c braid out elongated',
 'intermediate', '45-90 minutes', true, false),

('beach-waves', 'coily',
 'A significantly different process for coily textures',
 'Beach waves on 4a-4c hair requires significant heat styling or a long-lasting braid out on fully stretched hair. Method 1: silk press or blow out first to achieve straightness, then use a curling iron to create waves. Method 2: large chunky braid out on blown out hair left overnight. The style will require maintenance every 1-2 days due to reversion.',
 'This is one of the more labor-intensive style translations for coily hair. Consider whether a protective style that mimics beach waves — like large faux locs or loose passion twists — would achieve a similar aesthetic with significantly less daily maintenance.',
 ARRAY['heat-protectant','blow-dry-cream','holding-spray','anti-humidity-spray'],
 ARRAY['blow dryer','large flat iron or curling iron','hooded dryer'],
 'beach waves 4c natural hair silk press waves tutorial',
 'advanced', '2-4 hours', true, false),

('beach-waves', 'extensions',
 'The easiest path to beach waves — the texture is built in',
 'Beach wave extensions come in the texture already. For wigs: a beach wave lace front is the simplest option — no styling needed. For sew-in: purchase body wave or beach wave weft. For clip-ins: wavy clip-in extensions blend with your natural hair whether straight or curly. Care: use a wide tooth comb only, apply a light leave-in to keep the wave pattern fresh, and store on a wig stand.',
 'Unlike natural hair, extension beach waves do not require daily restyling — the wave pattern holds without heat. Human hair extensions can be refreshed with a curling iron on low heat. Synthetic extensions cannot be heat styled.',
 ARRAY['wig-care','leave-in','detangler','wig-shine-spray'],
 ARRAY['wide tooth comb','wig stand','satin bonnet'],
 'beach wave wig install tutorial lace front styling',
 'beginner', '5-15 minutes install', false, true);

-- WASH AND GO
INSERT INTO style_translations
(style_slug, hair_family, translation_headline,
 how_to_achieve, key_difference, products_needed,
 tools_needed, youtube_search_override,
 difficulty_for_family, time_estimate,
 heat_required, fake_hair_required) VALUES

('wash-and-go', 'wavy',
 'Enhancing natural wave definition',
 'Apply a lightweight curl cream or mousse to soaking wet hair. Scrunch upward from ends to roots. Do not touch while drying. Diffuse on low heat or air dry completely. Scrunch out the cast when fully dry.',
 'Wavy wash and gos need very lightweight products — anything too heavy will weigh down the wave pattern and create frizz rather than definition.',
 ARRAY['mousse','light-curl-cream','leave-in'],
 ARRAY['diffuser','microfiber towel'],
 'wash and go 2b 2c wavy hair tutorial',
 'beginner', '20-30 minutes', false, false),

('wash-and-go', 'curly',
 'Defining and clumping your curl pattern',
 'Section wet hair and apply leave-in conditioner followed by a gel or curl cream. Use the praying hands method or rake through each section for even distribution. Diffuse on low heat or air dry. Scrunch out the cast when fully dry.',
 'Curl clumping is the goal — encourage hair strands to group together by applying product in sections and not separating curls too much while styling.',
 ARRAY['leave-in','gel','curl-cream'],
 ARRAY['diffuser','wide tooth comb'],
 'wash and go 3a 3b 3c curly hair tutorial',
 'beginner', '30-45 minutes', false, false),

('wash-and-go', 'coily',
 'Maximum moisture and definition for tight coils',
 'Wash and apply deep conditioner. On soaking wet hair apply leave-in in sections using the LCO method (Leave-in, Cream, Oil). Apply gel over the top in each section. Shingling or finger coiling each section gives maximum definition. Diffuse or air dry under a hooded dryer.',
 'Shrinkage is significant on 4c hair — a wash and go may shrink to 20-30% of the stretched length. This is normal and healthy. If length is desired try a braid out or twist out instead.',
 ARRAY['leave-in','curl-cream','gel','sealing-oil'],
 ARRAY['hooded dryer or diffuser','spray bottle','wide tooth comb'],
 'wash and go 4a 4b 4c natural hair tutorial shrinkage',
 'intermediate', '45-90 minutes', false, false);

-- SILK PRESS
INSERT INTO style_translations
(style_slug, hair_family, translation_headline,
 how_to_achieve, key_difference, products_needed,
 tools_needed, youtube_search_override,
 difficulty_for_family, time_estimate,
 heat_required, fake_hair_required) VALUES

('silk-press', 'straight',
 'A smoothing treatment more than a style change',
 'For 1a-1c hair a silk press means a deep conditioning treatment followed by a professional blow dry and flat iron pass for maximum shine and smoothness. The goal is glass-like shine and zero frizz.',
 'Straight hair does not require the same heat exposure as curly or coily hair to achieve this look — use lower heat settings (300-350F) and fewer passes.',
 ARRAY['heat-protectant','blow-dry-cream','finishing-serum'],
 ARRAY['blow dryer with round brush','flat iron','heat protectant spray'],
 'silk press tutorial straight fine hair salon blowout',
 'beginner', '30-60 minutes', true, false),

('silk-press', 'curly',
 'Temporarily straightening your curl pattern',
 'Shampoo and deep condition. Blow dry in sections using tension with a paddle brush. Flat iron in thin sections on medium-high heat (380-410F for 3a-3c). Apply heat protectant before every heat tool. Seal with a light finishing serum.',
 'The silk press is a temporary style — your curl pattern will return with water. Avoid humidity and sweat to maintain longevity. Wrap hair at night with a silk scarf.',
 ARRAY['heat-protectant','blow-dry-cream','anti-humidity-spray','finishing-serum'],
 ARRAY['blow dryer with paddle brush','flat iron','silk scarf for nighttime'],
 'silk press tutorial 3c curly hair at home',
 'intermediate', '1-2 hours', true, false),

('silk-press', 'coily',
 'The most transformative version of this style',
 'Shampoo with a clarifying shampoo first to remove buildup that causes heat damage. Deep condition with heat for 30-45 minutes. Blow dry in sections on medium heat with a tension comb attachment. Flat iron in very thin sections on high heat (410-450F for 4c). Apply heat protectant before every single pass.',
 'Heat damage is a real risk on 4c coily hair — too much heat or too many passes permanently alters the curl pattern. Consider doing a silk press no more than 2-3 times per year. Always do a strand test first if you have not used heat recently.',
 ARRAY['clarifying-shampoo','heat-protectant','blow-dry-cream','anti-humidity-spray'],
 ARRAY['blow dryer with comb attachment','flat iron 450F capable','fine tooth comb'],
 'silk press 4c natural hair tutorial no damage',
 'advanced', '2-4 hours', true, false),

('silk-press', 'extensions',
 'Achieve the silk press look without heat on natural hair',
 'A straight wig or straight clip-in extensions give the silk press aesthetic without applying any heat to your natural hair underneath. For human hair wigs: flat iron on low heat for extra smoothness. For synthetic: use a heat-resistant synthetic only.',
 'This is the protective option for those who want the silk press look without the heat damage risk. Your natural hair stays moisturized and protected underneath.',
 ARRAY['wig-care','edge-control','wig-shine-spray'],
 ARRAY['wig stand','wide tooth comb','flat iron (human hair only low heat)'],
 'straight wig install silk press look tutorial lace front',
 'beginner', '10-20 minutes', false, true);
