insert into categories (name, slug) values
  ('shampoo', 'shampoo'),
  ('conditioner', 'conditioner'),
  ('deep-conditioner', 'deep-conditioner'),
  ('leave-in', 'leave-in'),
  ('styler', 'styler'),
  ('gel', 'gel'),
  ('oil', 'oil'),
  ('butter', 'butter'),
  ('scalp-treatment', 'scalp-treatment'),
  ('curl-cream', 'curl-cream'),
  ('mousse', 'mousse'),
  ('treatment', 'treatment'),
  ('other', 'other')
on conflict (name) do nothing;
