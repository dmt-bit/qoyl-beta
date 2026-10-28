-- Backfill styles.install_types/requires_fake_hair for rows left null/
-- empty by earlier seeding.
--
-- Checked against the live catalog (28 rows) before writing this:
-- none of them are wig/lace-front/u-part/frontal/sew-in/weave named,
-- so the first two UPDATEs below match zero rows today - this is a
-- safety net for catalog styles added later with those names, not a
-- fix for existing broken rows (there aren't any to fix). The third
-- UPDATE (wash and go/twist out/braid out) also matches rows that
-- already have requires_fake_hair = false, so it's a no-op against
-- today's data too. Keeping all three anyway, since the WHERE clause
-- only ever touches a row with install_types still null/empty.
--
-- Values corrected to the real InstallType
-- enum (lib/installTypes.ts) rather than the request's literal
-- "lace front wig"/"u-part wig" strings - those don't match any value
-- installOptionsFor() checks against, so writing them verbatim would
-- silently narrow every matching style's options to zero (the Set
-- intersection in lib/installTypes.ts's installOptionsFor would find
-- no overlap and fall back to showing all 8 options anyway - not a
-- crash, but not a real narrowing either, which defeats the point of
-- backfilling this column at all).
--
-- Only touches rows where install_types is null or empty, per the
-- request - never overwrites a style that already has real values.

update styles
set install_types = array['glue_tape_wig', 'u_part_wig', 'closure_frontal_install'],
    requires_fake_hair = true
where (install_types is null or array_length(install_types, 1) is null)
  and (name ilike '%wig%' or name ilike '%lace front%' or name ilike '%u-part%' or name ilike '%u part%' or name ilike '%frontal%');

update styles
set install_types = array['sew_in'],
    requires_fake_hair = true
where (install_types is null or array_length(install_types, 1) is null)
  and (name ilike '%sew-in%' or name ilike '%sew in%' or name ilike '%weave%')
  -- Don't reclassify a row the wig rule above already touched in this
  -- same script (e.g. a hypothetical "weave wig" name).
  and not (name ilike '%wig%' or name ilike '%lace front%' or name ilike '%u-part%' or name ilike '%u part%' or name ilike '%frontal%');

update styles
set requires_fake_hair = false
where (install_types is null or array_length(install_types, 1) is null)
  and (name ilike '%wash and go%' or name ilike '%twist out%' or name ilike '%braid out%');
