-- Travel kit survey v2 (wig/extension/protective/natural answers), kit
-- failure handling, and the 'failed' status. Run in the Supabase SQL editor.
-- Safe to re-run: every column is IF NOT EXISTS, and the status constraint
-- is dropped and re-added.

ALTER TABLE travel_kits
  ADD COLUMN IF NOT EXISTS trip_length text,
  ADD COLUMN IF NOT EXISTS hair_situation text,
  ADD COLUMN IF NOT EXISTS under_wig text,
  ADD COLUMN IF NOT EXISTS wig_type text,
  ADD COLUMN IF NOT EXISTS wig_adhesive text,
  ADD COLUMN IF NOT EXISTS extension_type text,
  ADD COLUMN IF NOT EXISTS natural_under_extensions text,
  ADD COLUMN IF NOT EXISTS style_age text,
  ADD COLUMN IF NOT EXISTS wash_plan text,
  ADD COLUMN IF NOT EXISTS wash_access text,
  ADD COLUMN IF NOT EXISTS wash_frequency text,
  ADD COLUMN IF NOT EXISTS concerns text[],
  ADD COLUMN IF NOT EXISTS error_message text;

-- Allow 'failed' (set when generation times out or produces no products).
-- The inline check from create_travel_kits.sql is named travel_kits_status_check.
ALTER TABLE travel_kits DROP CONSTRAINT IF EXISTS travel_kits_status_check;
ALTER TABLE travel_kits
  ADD CONSTRAINT travel_kits_status_check
  CHECK (status IN ('pending_payment', 'active', 'cancelled', 'failed'));
