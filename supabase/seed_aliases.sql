-- For each ingredient group below: link every listed variant string to a
-- single ingredients row, reusing an existing row if one already matches
-- any of the variants (several of these -- Butyrospermum Parkii Butter,
-- Simmondsia Chinensis Seed Oil, Argania Spinosa Kernel Oil, Panthenol --
-- are already referenced by name in lib/compatibility.ts's curl-type
-- adjustment rules, so they're expected to already exist). Only inserts a
-- new ingredients row when truly absent, so this never creates a
-- duplicate ingredient with its own disconnected compatibility_scores.

-- Water
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Aqua', 'Water'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['water','aqua','eau','deionized water','purified water'])
       or lower(common_name) = any (array['water','aqua','eau','deionized water','purified water'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['water','aqua','eau','deionized water','purified water'])
      or lower(common_name) = any (array['water','aqua','eau','deionized water','purified water'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Water','Aqua','Eau','Deionized Water','Purified Water']) as v(alias)
on conflict (alias) do nothing;

-- Shea butter
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Butyrospermum Parkii Butter', 'Shea Butter'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['butyrospermum parkii butter','butyrospermum parkii (shea) butter','shea butter','african shea butter'])
       or lower(common_name) = any (array['butyrospermum parkii butter','butyrospermum parkii (shea) butter','shea butter','african shea butter'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['butyrospermum parkii butter','butyrospermum parkii (shea) butter','shea butter','african shea butter'])
      or lower(common_name) = any (array['butyrospermum parkii butter','butyrospermum parkii (shea) butter','shea butter','african shea butter'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Butyrospermum Parkii Butter','Butyrospermum Parkii (Shea) Butter','Shea Butter','African Shea Butter']) as v(alias)
on conflict (alias) do nothing;

-- Glycerin
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Glycerin', 'Glycerin'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['glycerin','glycerine','vegetable glycerin','glycerol'])
       or lower(common_name) = any (array['glycerin','glycerine','vegetable glycerin','glycerol'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['glycerin','glycerine','vegetable glycerin','glycerol'])
      or lower(common_name) = any (array['glycerin','glycerine','vegetable glycerin','glycerol'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Glycerin','Glycerine','Vegetable Glycerin','Glycerol']) as v(alias)
on conflict (alias) do nothing;

-- Castor oil
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Ricinus Communis Seed Oil', 'Castor Oil'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['ricinus communis seed oil','ricinus communis (castor) seed oil','castor oil','jamaican black castor oil'])
       or lower(common_name) = any (array['ricinus communis seed oil','ricinus communis (castor) seed oil','castor oil','jamaican black castor oil'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['ricinus communis seed oil','ricinus communis (castor) seed oil','castor oil','jamaican black castor oil'])
      or lower(common_name) = any (array['ricinus communis seed oil','ricinus communis (castor) seed oil','castor oil','jamaican black castor oil'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Ricinus Communis Seed Oil','Ricinus Communis (Castor) Seed Oil','Castor Oil','Jamaican Black Castor Oil']) as v(alias)
on conflict (alias) do nothing;

-- Coconut oil
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Cocos Nucifera Oil', 'Coconut Oil'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['cocos nucifera oil','cocos nucifera (coconut) oil','coconut oil','fractionated coconut oil'])
       or lower(common_name) = any (array['cocos nucifera oil','cocos nucifera (coconut) oil','coconut oil','fractionated coconut oil'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['cocos nucifera oil','cocos nucifera (coconut) oil','coconut oil','fractionated coconut oil'])
      or lower(common_name) = any (array['cocos nucifera oil','cocos nucifera (coconut) oil','coconut oil','fractionated coconut oil'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Cocos Nucifera Oil','Cocos Nucifera (Coconut) Oil','Coconut Oil','Fractionated Coconut Oil']) as v(alias)
on conflict (alias) do nothing;

-- Jojoba oil
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Simmondsia Chinensis Seed Oil', 'Jojoba Oil'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['simmondsia chinensis seed oil','simmondsia chinensis (jojoba) seed oil','jojoba oil'])
       or lower(common_name) = any (array['simmondsia chinensis seed oil','simmondsia chinensis (jojoba) seed oil','jojoba oil'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['simmondsia chinensis seed oil','simmondsia chinensis (jojoba) seed oil','jojoba oil'])
      or lower(common_name) = any (array['simmondsia chinensis seed oil','simmondsia chinensis (jojoba) seed oil','jojoba oil'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Simmondsia Chinensis Seed Oil','Simmondsia Chinensis (Jojoba) Seed Oil','Jojoba Oil']) as v(alias)
on conflict (alias) do nothing;

-- Aloe
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Aloe Barbadensis Leaf Juice', 'Aloe Vera'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['aloe barbadensis leaf juice','aloe vera','aloe barbadensis','aloe vera gel'])
       or lower(common_name) = any (array['aloe barbadensis leaf juice','aloe vera','aloe barbadensis','aloe vera gel'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['aloe barbadensis leaf juice','aloe vera','aloe barbadensis','aloe vera gel'])
      or lower(common_name) = any (array['aloe barbadensis leaf juice','aloe vera','aloe barbadensis','aloe vera gel'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Aloe Barbadensis Leaf Juice','Aloe Vera','Aloe Barbadensis','Aloe Vera Gel']) as v(alias)
on conflict (alias) do nothing;

-- Argan oil
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Argania Spinosa Kernel Oil', 'Argan Oil'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['argania spinosa kernel oil','argan oil','argania spinosa oil'])
       or lower(common_name) = any (array['argania spinosa kernel oil','argan oil','argania spinosa oil'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['argania spinosa kernel oil','argan oil','argania spinosa oil'])
      or lower(common_name) = any (array['argania spinosa kernel oil','argan oil','argania spinosa oil'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Argania Spinosa Kernel Oil','Argan Oil','Argania Spinosa Oil']) as v(alias)
on conflict (alias) do nothing;

-- BTMS
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Behentrimonium Methosulfate', 'BTMS'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['behentrimonium methosulfate','btms','btms-50','btms-25'])
       or lower(common_name) = any (array['behentrimonium methosulfate','btms','btms-50','btms-25'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['behentrimonium methosulfate','btms','btms-50','btms-25'])
      or lower(common_name) = any (array['behentrimonium methosulfate','btms','btms-50','btms-25'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Behentrimonium Methosulfate','BTMS','BTMS-50','BTMS-25']) as v(alias)
on conflict (alias) do nothing;

-- Panthenol
with base as (
  insert into ingredients (inci_name, common_name)
  select 'Panthenol', 'Panthenol'
  where not exists (
    select 1 from ingredients
    where lower(inci_name) = any (array['panthenol','pro-vitamin b5','dl-panthenol','d-panthenol'])
       or lower(common_name) = any (array['panthenol','pro-vitamin b5','dl-panthenol','d-panthenol'])
  )
  returning id
),
resolved as (
  (select id from base)
  union all
  (select id from ingredients
   where lower(inci_name) = any (array['panthenol','pro-vitamin b5','dl-panthenol','d-panthenol'])
      or lower(common_name) = any (array['panthenol','pro-vitamin b5','dl-panthenol','d-panthenol'])
   limit 1)
)
insert into aliases (ingredient_id, alias)
select resolved.id, v.alias
from resolved, unnest(array['Panthenol','Pro-Vitamin B5','DL-Panthenol','D-Panthenol']) as v(alias)
on conflict (alias) do nothing;
