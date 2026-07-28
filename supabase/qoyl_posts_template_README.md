# qoyl_posts_template.csv

Template for bulk-adding rows to the `posts` table. One row per post; column names match the table exactly.

## Valid values

- `category`: `ingredient-evaluation`, `product-comparison`, `response-video`, `general`
- `hair_type`: `all`, `straight`, `wavy`, `curly`, `coily`, `extensions`
- `content_type`: `article`, `original-video`, `repost` (defaults to `article` if left blank)
- `source_platform`: `tiktok`, `instagram`, `youtube`, `twitter` (leave blank for `article` posts)

## Notes

- `source_creator`, `source_creator_url`, `source_platform`, and `video_url` only apply to `original-video`/`repost` posts -- leave blank for `article`.
- `video_url` is required for the embed to actually show on `original-video`/`repost` posts.
- `body` supports Markdown.
