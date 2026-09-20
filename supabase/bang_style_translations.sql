-- Bang-style YouTube search overrides + translation guidance for
-- style_translations, per the /style-match disambiguation feature.
-- All 6 slugs (baby-bangs, curtain-bangs, micro-bangs, blunt-bangs,
-- side-swept-bangs, wispy-bangs) already exist in the live `styles`
-- table (confirmed before writing this), so the style_slug FK resolves
-- cleanly - no styles table changes needed. 'straight' only for now,
-- matching the two example rows given; add 'wavy'/'curly'/'coily'
-- variants the same way if bangs guidance needs to differ by texture.
INSERT INTO style_translations
(style_slug, hair_family, translation_headline,
 how_to_achieve, key_difference, products_needed,
 tools_needed, youtube_search_override,
 difficulty_for_family, time_estimate,
 heat_required, fake_hair_required) VALUES

('baby-bangs', 'straight',
 'Baby bangs require a professional cut — this is not a DIY style',
 'Baby bangs sit at or above the eyebrow and require precision cutting. The length is typically 1-2 inches from the hairline. Styling: blow dry forward with a round brush, or air dry for a more textured look. They require trimming every 3-4 weeks as they grow out quickly.',
 'Baby bangs are a commitment — they look dramatically different from curtain bangs or blunt bangs. There is no easy way to grow them out gracefully. Make sure this is what is shown in the photo before proceeding.',
 ARRAY['heat-protectant','volumizing-spray','light-hold-spray'],
 ARRAY['round brush','blow dryer','fine comb'],
 'baby bangs tutorial straight hair how to style at home',
 'advanced', '30-60 min at salon · 5 min daily styling', true, false),

('curtain-bangs', 'straight',
 'Curtain bangs are one of the most beginner-friendly bang styles',
 'Curtain bangs are longer bangs parted in the middle and swept to the sides, blending into the rest of your hair. Cutting: ask for face-framing layers starting at cheekbone length, parted at your natural part. Styling: round brush blow dry outward and back, or air dry and use a flat iron to bend the ends away from your face. They grow out gracefully into face-framing layers with no awkward stage.',
 'Curtain bangs are the most forgiving bang style — unlike baby bangs they can be styled back or pinned away when you do not want to deal with them, and they grow out into a normal layered look rather than needing to be cut off.',
 ARRAY['heat-protectant','texturizing-spray','light-hold-spray'],
 ARRAY['round brush','blow dryer','flat iron (optional)'],
 'curtain bangs tutorial straight hair how to style round brush',
 'beginner', '15-30 min at salon · 5-10 min daily styling', true, false),

('micro-bangs', 'straight',
 'The most extreme bang length — an even bigger commitment than baby bangs',
 'Micro bangs sit well above the eyebrow, often high on the forehead, and require very precise professional cutting. Because so little length is left, even small cutting errors are highly visible. Styling: blow dry straight down with a small round brush, or use a flat iron on the shortest sections. They need trimming every 2-3 weeks to keep the line clean as they grow.',
 'Micro bangs are shorter and sit higher than baby bangs — if the bangs in the photo cover more than the very top of the forehead, this is likely baby bangs instead.',
 ARRAY['heat-protectant','volumizing-spray','light-hold-spray'],
 ARRAY['small round brush','blow dryer','fine comb'],
 'micro bangs tutorial extreme short bangs styling',
 'advanced', '30-60 min at salon · 5 min daily styling', true, false),

('blunt-bangs', 'straight',
 'A clean, uniform line across the forehead',
 'Blunt bangs are cut straight across at eyebrow level with no layering, creating one uniform line. Cutting: sectioned dry for precision, cut straight across with sharp shears - never with a razor, which would remove the crisp edge. Styling: blow dry straight down with a paddle brush and finish with a flat iron for the cleanest line.',
 'Unlike curtain bangs, blunt bangs are not swept to the sides or layered - the straight-across line is the entire point of the style, so any softness or parting in the photo points to curtain or side-swept bangs instead.',
 ARRAY['heat-protectant','flat-iron-serum','light-hold-spray'],
 ARRAY['paddle brush','blow dryer','flat iron'],
 'blunt bangs tutorial straight across styling at home',
 'intermediate', '30-45 min at salon · 5-10 min daily styling', true, false),

('side-swept-bangs', 'straight',
 'Bangs swept diagonally to one side, blending with the rest of your style',
 'Side swept bangs are longer bangs cut on a diagonal and directed to one side of the face rather than straight down. Cutting: cut at an angle from a deep side part, longest point reaching cheekbone or below. Styling: blow dry with a round brush pulling hair across the forehead to one side, set with a light hold spray so it stays in place.',
 'Side swept bangs go to ONE side only, unlike curtain bangs which are parted in the middle and swept to BOTH sides - check which side(s) the bangs fall on before confirming this over curtain bangs.',
 ARRAY['heat-protectant','light-hold-spray','shine-serum'],
 ARRAY['round brush','blow dryer','bobby pins (optional)'],
 'side swept bangs tutorial straight hair round brush',
 'beginner', '15-30 min at salon · 5 min daily styling', true, false),

('wispy-bangs', 'straight',
 'Soft, feathery bangs with texture rather than a solid blunt line',
 'Wispy bangs are cut using point-cutting or texturizing shears rather than a straight blunt line, leaving soft, separated pieces instead of one solid edge. Cutting: cut slightly longer than the desired finished length, then point-cut into the ends to remove weight and create movement. Styling: air dry or diffuse for natural texture, or blow dry with a small round brush and finger-separate the pieces - never flat iron them into a solid block.',
 'The defining feature is texture, not length or direction - wispy bangs can sit at almost any length or angle, but they are always soft and separated rather than one blunt, solid line like blunt bangs.',
 ARRAY['texturizing-spray','light-hold-spray','shine-serum'],
 ARRAY['small round brush','blow dryer','texturizing shears (for the cut itself)'],
 'wispy bangs tutorial soft texture styling',
 'beginner', '15-20 min at salon · 5 min daily styling', true, false)
ON CONFLICT (style_slug, hair_family) DO UPDATE SET
  translation_headline = EXCLUDED.translation_headline,
  how_to_achieve = EXCLUDED.how_to_achieve,
  key_difference = EXCLUDED.key_difference,
  products_needed = EXCLUDED.products_needed,
  tools_needed = EXCLUDED.tools_needed,
  youtube_search_override = EXCLUDED.youtube_search_override,
  difficulty_for_family = EXCLUDED.difficulty_for_family,
  time_estimate = EXCLUDED.time_estimate,
  heat_required = EXCLUDED.heat_required,
  fake_hair_required = EXCLUDED.fake_hair_required;
