-- Content-type system for the home page feed (article / original-video /
-- repost) plus source attribution fields for reposted content.

alter table posts add column if not exists content_type text default 'article'
  check (content_type in ('article', 'original-video', 'repost'));

alter table posts add column if not exists source_creator text;
alter table posts add column if not exists source_creator_url text;
alter table posts add column if not exists source_platform text
  check (source_platform in ('tiktok', 'instagram', 'youtube', 'twitter', null));

-- Not part of the original request, but required for the feature to work:
-- "original-video"/"repost" posts need an actual video to embed and play,
-- and nothing in the requested columns stores that -- source_creator_url
-- is the attribution link (e.g. the creator's TikTok profile), not
-- necessarily the specific video. Added so /posts/[slug] has something to
-- embed and the home page card has something to check before showing the
-- play-button overlay.
alter table posts add column if not exists video_url text;

-- The two existing text posts predate content_type -- the column default
-- above already backfills every existing row to 'article' at ALTER TABLE
-- time, so these two UPDATEs are redundant today, but kept as requested
-- in case a future post is inserted with an explicit non-default
-- content_type before this migration runs.
update posts set content_type = 'article' where slug = 'glycerin-ingredient-of-the-day';
update posts set content_type = 'article' where slug = 'propylene-glycol-ingredient-of-the-day';

-- Full-text search (server-side, for when the post library outgrows
-- client-side filtering).
alter table posts add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(body, ''))
  ) stored;

create index if not exists posts_search_idx on posts using gin(search_vector);
