-- Adds 'mens' and 'baby' as allowed posts.hair_type values for the new
-- "Men's Hair" and "Baby & Kids" home page filter tabs.
alter table posts drop constraint if exists posts_hair_type_check;
alter table posts add constraint posts_hair_type_check
  check (hair_type in ('all', 'straight', 'wavy', 'curly', 'coily', 'extensions', 'mens', 'baby'));
