-- Face shape and natural hair color detection (style match audit follow-up).
-- Run in the Supabase SQL editor. Safe to re-run.

-- Per-match: tied to the specific photo that was analyzed.
ALTER TABLE style_matches
  ADD COLUMN IF NOT EXISTS face_shape text,
  ADD COLUMN IF NOT EXISTS natural_hair_color text;

-- On the user's profile: written once (first photo upload only - see
-- app/api/style-match/create/route.ts) so it doesn't get silently
-- overwritten by a later photo of a different look.
--
-- NOTE: there is no "this is a selfie of me" vs "this is an inspiration
-- photo of someone else" distinction anywhere in this app - the only
-- upload entry point says "a picture of the style you want," which is
-- very often someone else's hair/face. This write happens for every
-- photo upload per the product decision made during this change, which
-- means an inspiration photo can write a stranger's face shape onto the
-- user's profile. Flagged here and in the PR description.
ALTER TABLE hair_profiles
  ADD COLUMN IF NOT EXISTS face_shape text,
  ADD COLUMN IF NOT EXISTS natural_hair_color text;

-- Soft style ranking by face shape (never a filter - see
-- app/style-match/page.tsx's visibleInspoStyles). Empty array = works
-- for everyone, ranks the same as a match.
ALTER TABLE styles
  ADD COLUMN IF NOT EXISTS face_shapes_flattering text[] DEFAULT ARRAY[]::text[];
