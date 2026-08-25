-- baby_profiles and child_profiles: separate from hair_profiles because
-- hair_profiles has a UNIQUE constraint on user_id (one adult profile per
-- account, see hair_profiles_auth.sql) - a parent needs to save profiles
-- for MULTIPLE children under one account, so these are their own tables
-- with a plain (non-unique) index on user_id instead.
--
-- Writes go through service-role API routes (app/api/family-profiles/*),
-- not directly from the client, so the authenticated RLS policies below
-- are defense-in-depth / future-proofing for a direct-client write path,
-- matching the existing hair_profiles_auth.sql pattern. Reads (dashboard
-- "Family profiles" list) go directly from the authenticated client.

create table if not exists baby_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  age_range text check (age_range in ('0-3_months', '3-6_months', '6-12_months', '12-18_months', '18-24_months')),
  hair_texture text check (hair_texture in (
    'fine_straight', 'fine_wavy', 'fine_curly', 'fine_coily',
    'coarse_straight', 'coarse_wavy', 'coarse_curly', 'coarse_coily',
    'not_sure'
  )),
  hair_density text check (hair_density in ('sparse', 'normal', 'thick')),
  scalp_condition text check (scalp_condition in ('normal', 'dry', 'cradle_cap', 'sensitive')),
  allergies_notes text,
  wash_frequency_preference text check (wash_frequency_preference in (
    'every_2_days', 'every_3_4_days', 'weekly', 'every_2_weeks_or_less'
  )),
  sensory_sensitive boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists baby_profiles_user_id_idx on baby_profiles(user_id);

alter table baby_profiles enable row level security;

create policy "Authenticated users can insert own baby profiles"
  on baby_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can select own baby profiles"
  on baby_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can update own baby profiles"
  on baby_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete own baby profiles"
  on baby_profiles for delete
  to authenticated
  using (auth.uid() = user_id);


create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  age_range text check (age_range in ('2-4', '5-7', '8-10', '11-12', '13+')),
  curl_type text, -- reuses hair_profiles' curl_type taxonomy (1a-4c, not_sure); no FK, matching hair_profiles' own free-text column
  hair_density text check (hair_density in ('fine', 'medium', 'thick')),
  scalp_condition text check (scalp_condition in ('normal', 'dry_flaky', 'sensitive_irritated', 'oily', 'dandruff_prone')),
  hair_concerns text[],
  wash_frequency text check (wash_frequency in ('daily', 'every_2_3_days', 'weekly', 'every_2_weeks')),
  cooperative_level text check (cooperative_level in ('parent_easy', 'parent_difficult', 'learning', 'independent')),
  sensory_sensitive boolean not null default false,
  uses_protective_styles boolean not null default false,
  protective_styles_use_extensions boolean,
  heat_tools_used boolean not null default false,
  zip_code text,
  climate text,
  water_hardness text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists child_profiles_user_id_idx on child_profiles(user_id);

alter table child_profiles enable row level security;

create policy "Authenticated users can insert own child profiles"
  on child_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can select own child profiles"
  on child_profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can update own child profiles"
  on child_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete own child profiles"
  on child_profiles for delete
  to authenticated
  using (auth.uid() = user_id);
