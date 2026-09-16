-- Re-tags existing styles with precise hair_types_compatible codes, and
-- adds the straight/wavy styles the new hair-family tabs need.
--
-- Deviates from the request in one place: silk-press's UPDATE is tagged
-- for all 12 codes rather than straight/wavy only (1a-2c) - per the
-- conversation, since silk press is a service applied to curly/coily
-- hair to straighten it, narrowing it to straight/wavy would drop it
-- from the tabs where it's most relevant. This also matches the value
-- in the INSERT block below (which won't run for silk-press anyway,
-- since it already exists and that block is ON CONFLICT DO NOTHING).
--
-- Everything else runs as given. Several of these UPDATEs are no-ops
-- against the live table (already tagged identically) - included
-- anyway so this script is idempotent and self-documenting.

UPDATE styles SET hair_types_compatible =
  ARRAY['1a','1b','1c','2a','2b','2c','3a','3b','3c','4a','4b','4c']
  WHERE slug = 'silk-press';

UPDATE styles SET hair_types_compatible =
  ARRAY['2a','2b','2c','3a','3b','3c','4a','4b','4c']
  WHERE slug = 'wash-and-go';

UPDATE styles SET hair_types_compatible =
  ARRAY['3a','3b','3c','4a','4b','4c']
  WHERE slug = 'twist-out';

UPDATE styles SET hair_types_compatible =
  ARRAY['3b','3c','4a','4b','4c']
  WHERE slug = 'braid-out';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'bantu-knots';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'high-puff';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'box-braids';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'knotless-braids';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'faux-locs';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'passion-twists';

UPDATE styles SET hair_types_compatible =
  ARRAY['4a','4b','4c']
  WHERE slug = 'locs';

UPDATE styles SET hair_types_compatible =
  ARRAY['3c','4a','4b','4c']
  WHERE slug = 'goddess-braids';

-- New straight/wavy styles (and a few curly/coily ones the family tabs
-- need) that don't exist in the table yet. silk-press is included here
-- too (matching the request) but is a no-op thanks to ON CONFLICT,
-- since the UPDATE above already re-tagged the existing row.
INSERT INTO styles (name, slug, description,
  hair_types_compatible, requires_fake_hair,
  estimated_time, difficulty) VALUES

('Silk Press', 'silk-press',
  'Heat-straightened natural hair with a silky smooth finish.',
  ARRAY['1a','1b','1c','2a','2b','2c','3a','3b','3c','4a','4b','4c'],
  false, '1-3 hours', 'intermediate'),

('Blowout', 'blowout',
  'Blow dried straight with volume and movement.',
  ARRAY['1a','1b','1c','2a','2b','2c'],
  false, '30-60 minutes', 'beginner'),

('Beach Waves', 'beach-waves',
  'Loose tousled waves achieved with a curling iron or braid out.',
  ARRAY['1b','1c','2a','2b','2c'],
  false, '20-45 minutes', 'beginner'),

('French Braid', 'french-braid',
  'Classic three-strand braid woven close to the scalp.',
  ARRAY['1a','1b','1c','2a','2b','2c','3a'],
  false, '10-20 minutes', 'beginner'),

('Dutch Braid', 'dutch-braid',
  'Inverted french braid that sits on top of the hair.',
  ARRAY['1a','1b','1c','2a','2b','2c'],
  false, '10-20 minutes', 'intermediate'),

('Space Buns', 'space-buns',
  'Two symmetrical buns positioned high on the head.',
  ARRAY['1a','1b','1c','2a','2b','2c','3a','3b'],
  false, '10-15 minutes', 'beginner'),

('Sleek Bun', 'sleek-bun',
  'Smooth, slicked-back bun with a polished finish.',
  ARRAY['1a','1b','1c','2a','2b'],
  false, '10-20 minutes', 'beginner'),

('Diffused Waves', 'diffused-waves',
  'Enhanced natural wave pattern using a diffuser attachment.',
  ARRAY['2a','2b','2c','3a'],
  false, '20-40 minutes', 'beginner'),

('Flexi Rod Set', 'flexi-rod-set',
  'Uniform spiral curls set on flexible rods overnight.',
  ARRAY['2c','3a','3b','3c','4a'],
  false, '1-2 hours', 'intermediate'),

('TWA', 'twa',
  'Teeny Weeny Afro - a short natural style that celebrates texture.',
  ARRAY['4a','4b','4c'],
  false, '10-20 minutes', 'beginner'),

('Flat Twist Out', 'flat-twist-out',
  'Defined stretched curl pattern from unraveled flat twists.',
  ARRAY['4a','4b','4c'],
  false, '1-2 hours', 'beginner'),

('Pineapple Updo', 'pineapple-updo',
  'High loose puff gathered at the crown - protective and quick.',
  ARRAY['3a','3b','3c','4a','4b','4c'],
  false, '5 minutes', 'beginner')

ON CONFLICT (slug) DO NOTHING;
