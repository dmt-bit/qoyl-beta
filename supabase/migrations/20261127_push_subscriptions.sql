-- push_subscriptions
-- Stores Web Push PushSubscription objects for each user/device.
-- One row per browser endpoint (a user can have multiple devices).

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,          -- push service URL (device-unique)
  p256dh      text not null,                 -- receiver public key
  auth        text not null,                 -- auth secret
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Fast lookup by user_id (send push to all of a user's devices).
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- RLS: users can only see and manage their own subscriptions.
alter table public.push_subscriptions enable row level security;

create policy "users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (used by the backend sendPush functions) can read all.
-- (Service role bypasses RLS by default in Supabase, so no extra policy needed.)
