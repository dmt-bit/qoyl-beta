-- Adds 'extensions' as an allowed posts.hair_type value for the new
-- "Extensions & Wigs" home page filter tab.
alter table posts drop constraint if exists posts_hair_type_check;
alter table posts add constraint posts_hair_type_check
  check (hair_type in ('all', 'straight', 'wavy', 'curly', 'coily', 'extensions'));
