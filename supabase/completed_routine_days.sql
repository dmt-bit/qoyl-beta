-- Daily check-off tracking for the routine page (streaks, calendar
-- completion/missed indicators, dashboard habit tracker).
create table if not exists completed_routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  completed_date date not null,
  wash_type text not null,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, completed_date)
);

-- RLS + policies, same defense-in-depth pattern as every other
-- user-owned table in this project (style_matches, saved_styles,
-- extension_profiles, etc.) even though the actual reads/writes go
-- through service-role API routes below - written idempotently
-- (drop-if-exists) per that same established lesson.
alter table completed_routine_days enable row level security;

drop policy if exists "Users can view own completed routine days" on completed_routine_days;
create policy "Users can view own completed routine days"
  on completed_routine_days for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own completed routine days" on completed_routine_days;
create policy "Users can insert own completed routine days"
  on completed_routine_days for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own completed routine days" on completed_routine_days;
create policy "Users can delete own completed routine days"
  on completed_routine_days for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists completed_routine_days_user_id_idx
  on completed_routine_days (user_id, completed_date);
