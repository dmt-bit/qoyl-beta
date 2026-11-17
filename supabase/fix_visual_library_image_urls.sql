-- Fixes broken Supabase storage URLs in visual_library.
-- The bucket is "media" and the folder inside is "media/photos",
-- so the correct public URL path is /media/media/photos/ not /media/photos/.
-- This was the same bug as CurlTypeSelector/profile/page - all hardcoded
-- storage URLs had the same single-"media" mistake.
UPDATE visual_library
SET image_url = replace(
  image_url,
  '/storage/v1/object/public/media/photos/',
  '/storage/v1/object/public/media/media/photos/'
)
WHERE image_url LIKE '%/storage/v1/object/public/media/photos/%';
