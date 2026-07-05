-- compatibility_scores and ingredients already existed with a normalized
-- schema (ingredients.inci_name/common_name joined to compatibility_scores
-- via ingredient_id, with score 0-10 and rating green/amber/red split by
-- hair_type/porosity/scalp_condition/thickness) rather than a flat
-- ingredient_name/porosity_level/score/flag table. Both were empty and
-- had RLS enabled with no policies, blocking all reads. Used the existing
-- schema instead of creating a redundant flat table.

create policy "Allow anon select"
  on ingredients for select
  to anon
  using (true);

create policy "Allow anon select"
  on compatibility_scores for select
  to anon
  using (true);

-- Looks up the best-matching score per ingredient, treating a null
-- hair_type/porosity/scalp_condition/thickness on a compatibility_scores
-- row as "applies generally," and preferring the most specific match
-- when multiple rows exist for the same ingredient.
create or replace function match_compatibility_scores(
  p_ingredient_names text[],
  p_hair_type text,
  p_porosity text,
  p_scalp_condition text,
  p_thickness text
)
returns table (
  ingredient_name text,
  score smallint,
  rating text
)
language sql
stable
as $$
  select distinct on (i.id)
    coalesce(i.common_name, i.inci_name) as ingredient_name,
    cs.score,
    cs.rating
  from ingredients i
  join compatibility_scores cs on cs.ingredient_id = i.id
  where (
      lower(i.inci_name) = any (p_ingredient_names)
      or lower(i.common_name) = any (p_ingredient_names)
    )
    and (cs.hair_type is null or cs.hair_type = p_hair_type)
    and (cs.porosity is null or cs.porosity = p_porosity)
    and (cs.scalp_condition is null or cs.scalp_condition = p_scalp_condition)
    and (cs.thickness is null or cs.thickness = p_thickness)
  order by i.id,
    (
      (cs.hair_type is not null)::int
      + (cs.porosity is not null)::int
      + (cs.scalp_condition is not null)::int
      + (cs.thickness is not null)::int
    ) desc;
$$;

grant execute on function match_compatibility_scores(text[], text, text, text, text) to anon, authenticated;
