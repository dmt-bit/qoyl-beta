# qoyl_posts_template.csv

The real content template/backlog used to bulk-add rows to the `posts` table (columns: `slug, title, category, hair_type, content_type, excerpt, body, hero_image_url, video_url, source_creator, source_creator_url, source_platform`).

`published_at` and `related_product_name` are intentionally not part of this template -- they're assigned at import time (see `supabase/seed_extensions_posts.sql` for the pattern: `now()` for `published_at`, left `NULL` unless a post is tied to a specific product).

## Valid values

- `category`: `ingredient-evaluation`, `product-comparison`, `response-video`, `general`
- `hair_type`: `all`, `straight`, `wavy`, `curly`, `coily`, `extensions`
- `content_type`: `article`, `original-video`, `repost` (defaults to `article` if left blank)
- `source_platform`: `tiktok`, `instagram`, `youtube`, `twitter` (leave blank for `article` posts, and for `original-video` posts too -- the embed platform is now detected from `video_url` itself. `source_platform` only matters for `repost` attribution text, e.g. "originally created by @creator on TikTok.")

## Notes

- `source_creator` / `source_creator_url` are for `repost` attribution -- leave blank for `article` and `original-video` posts (there's no "source" to credit for Qoyl's own content).
- `video_url` is required for the embed to actually show on `original-video`/`repost` posts.
- `body` supports Markdown.
