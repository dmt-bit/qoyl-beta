-- posts has no hair_type column yet (confirmed live -- selecting it
-- returns "column posts.hair_type does not exist"). Adds it as a nullable
-- text column with a check constraint on the values the home page's
-- filter tabs and the /insights-style "coily also matches 'all'" rule
-- rely on. Nullable/no default so any future untagged post simply won't
-- appear under a texture-specific tab until tagged -- it still shows
-- under "All".
alter table posts
  add column hair_type text
  check (hair_type in ('straight', 'wavy', 'curly', 'coily', 'all'));

update posts set excerpt = 'Glycerin is in almost everything — and depending on your climate and porosity, it might be working against you.'
  where slug = 'glycerin-ingredient-of-the-day';

update posts set excerpt = 'It''s in almost every hair product on the market. Here''s what it actually does to your hair.'
  where slug = 'propylene-glycol-ingredient-of-the-day';

update posts set hair_type = 'all' where slug = 'glycerin-ingredient-of-the-day';
update posts set hair_type = 'all' where slug = 'propylene-glycol-ingredient-of-the-day';
update posts set hair_type = 'all' where slug = 'sephora-beauty-preferences-response';
