-- Install-type support for Style Match: a new question, product/tutorial
-- surfacing, and badges. Run in the Supabase SQL editor. Not yet run.
--
-- NOTE: styles.fake_hair_type already exists (nullable text) and is reused
-- here as the "texture" field -- no fake_hair_texture column is added, to
-- avoid a duplicate of the same concept under two names.

alter table styles
  add column if not exists install_types text[],
  add column if not exists tutorial_url text;

-- A new top-level column on style_matches, matching how involves_extensions /
-- hair_addition_preference / color_match are already stored there (not
-- buried in the detected_details jsonb blob).
alter table style_matches
  add column if not exists install_type text;

-- Backfill: the 5 catalog styles already flagged requires_fake_hair = true.
-- install_types reflects how each is actually installed (hand-braided/
-- crocheted-in bulk hair, not a sew-in or wig) -- see lib/installTypes.ts
-- for the canonical value set this matches.
update styles set
  install_types = array['crochet', 'no_sew', 'diy_at_home'],
  fake_hair_type = coalesce(fake_hair_type, 'kanekalon braiding hair')
where slug in ('box-braids', 'knotless-braids', 'goddess-braids');

update styles set
  install_types = array['crochet', 'no_sew', 'diy_at_home'],
  fake_hair_type = coalesce(fake_hair_type, 'synthetic or human hair bulk, water-wave texture')
where slug = 'passion-twists';

update styles set
  install_types = array['crochet', 'no_sew', 'diy_at_home'],
  fake_hair_type = coalesce(fake_hair_type, 'faux loc hair / marley hair / synthetic braiding hair')
where slug = 'faux-locs';
