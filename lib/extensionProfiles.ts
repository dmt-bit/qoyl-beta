import { supabase } from "@/lib/supabase";

export type ExtensionProfile = {
  id: string;
  user_id: string;
  natural_curl_type: string | null;
  natural_porosity: string | null;
  natural_hair_length: string | null;
  extension_types: string[] | null;
  extension_texture: string | null;
  needs_blending: boolean;
  blend_method: string | null;
  leave_out_amount: string | null;
  wear_schedule: string | null;
  install_duration_weeks: number | null;
  scalp_condition: string | null;
  uses_adhesive: boolean;
  adhesive_type: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const EXTENSION_PROFILE_COLUMNS =
  "id, user_id, natural_curl_type, natural_porosity, natural_hair_length, extension_types, extension_texture, needs_blending, blend_method, leave_out_amount, wear_schedule, install_duration_weeks, scalp_condition, uses_adhesive, adhesive_type, zip_code, notes, created_at, updated_at";

// No unique constraint on user_id (confirmed live, same as
// baby_profiles/child_profiles), but unlike those tables there's no
// "add another install" concept in this feature - the most recently
// saved row is treated as the user's current install everywhere in the
// app (dashboard card, /routine, feed pre-filtering, /search section).
export async function fetchLatestExtensionProfileByUserId(
  userId: string
): Promise<ExtensionProfile | null> {
  const { data } = await supabase
    .from("extension_profiles")
    .select(EXTENSION_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? fromDbRow(data) : null;
}

export async function fetchExtensionProfileById(id: string): Promise<ExtensionProfile | null> {
  const { data } = await supabase
    .from("extension_profiles")
    .select(EXTENSION_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? fromDbRow(data) : null;
}

// ---- DB quirk transforms ---------------------------------------------
//
// extension_profiles pre-dates this feature and has CHECK constraints on
// several columns (extension_texture, scalp_condition, blend_method,
// leave_out_amount, wear_schedule, natural_porosity) whose exact allowed
// values aren't visible through the PostgREST schema or any SQL access
// this session has - they were discovered by probing live inserts. Most
// of this app's UI values map cleanly onto a DB value; a few don't map
// to ANYTHING discoverable (documented per-field below) and are stored
// as null with the original selection preserved in `notes` instead of
// silently discarding the user's answer. This keeps every other
// consumer (the form, the routine generators, the dashboard) working
// with the original clean UI-level values - the DB's quirks are fully
// contained to toDbRow/fromDbRow.

const TEXTURE_TO_DB: Record<string, string> = {
  synthetic: "synthetic_straight",
  human_straight: "human_hair_straight",
  human_wavy: "human_hair_wavy",
  human_curly: "human_hair_curly",
  // No "blended" or "heat-resistant" value exists in the DB constraint -
  // closest available given human hair extensions are cared for most
  // similarly; the original choice is preserved in notes.
  blended: "human_hair_straight",
  heat_resistant_synthetic: "synthetic_straight",
};
const TEXTURE_FROM_DB: Record<string, string> = {
  human_hair_straight: "human_straight",
  human_hair_wavy: "human_wavy",
  human_hair_curly: "human_curly",
  synthetic_straight: "synthetic",
  synthetic_wavy: "synthetic",
  synthetic_curly: "synthetic",
  synthetic_coily: "synthetic",
  straight: "human_straight",
  wavy: "human_wavy",
  curly: "human_curly",
  coily: "human_curly",
};

const SCALP_CONDITION_TO_DB: Record<string, string> = {
  normal: "normal",
  dry_tight: "dry",
  itchy: "itchy",
  oily: "oily",
  sensitive: "sensitive",
};
const SCALP_CONDITION_FROM_DB: Record<string, string> = {
  normal: "normal",
  dry: "dry_tight",
  itchy: "itchy",
  oily: "oily",
  sensitive: "sensitive",
};

// blow_dry_tension and no_leave_out have no discoverable DB equivalent.
const BLEND_METHOD_TO_DB: Record<string, string> = {
  heat_flat_iron: "heat_flat_iron",
  no_heat_banding: "no_heat_banding",
  no_heat_rollers: "no_heat_rollers",
  not_sure: "not_sure",
};
const BLEND_METHOD_FROM_DB: Record<string, string> = {
  heat_flat_iron: "heat_flat_iron",
  no_heat_banding: "no_heat_banding",
  no_heat_rollers: "no_heat_rollers",
  not_sure: "not_sure",
};

// "none" (fully covered) has no discoverable DB equivalent.
const LEAVE_OUT_TO_DB: Record<string, string> = {
  edges_only: "edges_only",
  small_section: "small_section",
  larger_section: "large_section",
};
const LEAVE_OUT_FROM_DB: Record<string, string> = {
  edges_only: "edges_only",
  small_section: "small_section",
  large_section: "larger_section",
};

// full_time and remove_nightly have no discoverable DB equivalent.
const WEAR_SCHEDULE_TO_DB: Record<string, string> = {
  few_days_week: "few_days_a_week",
  occasional: "occasional_events",
};
const WEAR_SCHEDULE_FROM_DB: Record<string, string> = {
  few_days_a_week: "few_days_week",
  occasional_events: "occasional",
};

// "not sure" has no discoverable DB equivalent (only low/medium/high do).
function porosityToDb(value: string | null): string | null {
  if (value === "low" || value === "medium" || value === "high") return value;
  return null;
}

function fallbackNote(label: string, uiValue: string | null, mapped: string | null | undefined): string | null {
  if (uiValue && !mapped) return `${label}: ${uiValue} (not representable in a constrained field)`;
  return null;
}

export function toDbRow(fields: {
  extension_texture: string | null;
  scalp_condition: string | null;
  blend_method: string | null;
  leave_out_amount: string | null;
  wear_schedule: string | null;
  natural_porosity: string | null;
  notes: string | null;
}): {
  extension_texture: string | null;
  scalp_condition: string | null;
  blend_method: string | null;
  leave_out_amount: string | null;
  wear_schedule: string | null;
  natural_porosity: string | null;
  notes: string | null;
} {
  const texture = fields.extension_texture ? TEXTURE_TO_DB[fields.extension_texture] ?? null : null;
  const scalp = fields.scalp_condition ? SCALP_CONDITION_TO_DB[fields.scalp_condition] ?? null : null;
  const blend = fields.blend_method ? BLEND_METHOD_TO_DB[fields.blend_method] ?? null : null;
  const leaveOut = fields.leave_out_amount ? LEAVE_OUT_TO_DB[fields.leave_out_amount] ?? null : null;
  const wear = fields.wear_schedule ? WEAR_SCHEDULE_TO_DB[fields.wear_schedule] ?? null : null;
  const porosity = porosityToDb(fields.natural_porosity);

  const fallbackNotes = [
    fallbackNote("Blend method", fields.blend_method, blend),
    fallbackNote("Leave-out amount", fields.leave_out_amount, leaveOut),
    fallbackNote("Wear schedule", fields.wear_schedule, wear),
    fallbackNote("Porosity", fields.natural_porosity, porosity),
  ].filter((n): n is string => Boolean(n));

  const notes = [fields.notes, ...fallbackNotes].filter(Boolean).join(" | ") || null;

  return {
    extension_texture: texture,
    scalp_condition: scalp,
    blend_method: blend,
    leave_out_amount: leaveOut,
    wear_schedule: wear,
    natural_porosity: porosity,
    notes,
  };
}

function fromDbRow(row: ExtensionProfile): ExtensionProfile {
  return {
    ...row,
    extension_texture: row.extension_texture ? TEXTURE_FROM_DB[row.extension_texture] ?? row.extension_texture : null,
    scalp_condition: row.scalp_condition
      ? SCALP_CONDITION_FROM_DB[row.scalp_condition] ?? row.scalp_condition
      : null,
    blend_method: row.blend_method ? BLEND_METHOD_FROM_DB[row.blend_method] ?? row.blend_method : null,
    leave_out_amount: row.leave_out_amount ? LEAVE_OUT_FROM_DB[row.leave_out_amount] ?? row.leave_out_amount : null,
    wear_schedule: row.wear_schedule ? WEAR_SCHEDULE_FROM_DB[row.wear_schedule] ?? row.wear_schedule : null,
  };
}

// ---- Value <-> label maps -------------------------------------------------
//
// extension_profiles.extension_types has a pre-existing CHECK constraint
// (the table predates this feature - see the SQL-discovery note in
// ExtensionProfileForm.tsx) that does NOT match a natural slug-per-card
// scheme: wig_full_lace and wig_360 are separate allowed values even
// though the form has one combined "Full Lace / 360 Wig" card, and
// there's no allowed value at all for "Protective style only" (an empty
// array is what the constraint accepts for that case instead). These
// labels are keyed by the actual allowed DB values.

export const EXTENSION_TYPE_LABELS: Record<string, string> = {
  wig_lace_front: "Lace Front Wig",
  wig_full_lace: "Full Lace / 360 Wig",
  wig_360: "Full Lace / 360 Wig",
  wig_glueless: "Glueless Wig",
  crochet: "Crochet Hair",
  tape_in: "Tape-In Extensions",
  k_tip: "K-Tip / Fusion Extensions",
  i_tip: "I-Tip / Micro Bead / Loop",
  clip_in: "Clip-In Extensions",
  sew_in_weave: "Sew-In Weave",
  halo: "Halo Extension",
};

export const WIG_TYPES = ["wig_lace_front", "wig_full_lace", "wig_360", "wig_glueless"];
export const ADHESIVE_ELIGIBLE_TYPES = [...WIG_TYPES, "tape_in"];
export const BLENDING_ELIGIBLE_TYPES = [...WIG_TYPES, "sew_in_weave", "clip_in"];

export const EXTENSION_TEXTURE_LABELS: Record<string, string> = {
  synthetic: "Synthetic hair",
  human_straight: "Human hair - straight",
  human_wavy: "Human hair - wavy",
  human_curly: "Human hair - curly",
  blended: "Blended (synthetic and human hair mix)",
  heat_resistant_synthetic: "Heat-resistant synthetic",
};

export const NATURAL_HAIR_LENGTH_LABELS: Record<string, string> = {
  short: "Short (less than 4 inches)",
  medium: "Medium (4-8 inches)",
  long: "Long (8-16 inches)",
  very_long: "Very long (over 16 inches)",
};

export const EXTENSION_SCALP_CONDITION_LABELS: Record<string, string> = {
  normal: "Normal",
  dry_tight: "Dry and tight",
  itchy: "Itchy (common under wigs and weaves)",
  oily: "Oily at the scalp",
  sensitive: "Sensitive or reactive",
};

export const BLEND_METHOD_LABELS: Record<string, string> = {
  heat_flat_iron: "Flat iron or heat tools",
  blow_dry_tension: "Blow dry with tension",
  no_heat_banding: "No heat - banding method",
  no_heat_rollers: "No heat - rollers or rods",
  no_leave_out: "I cover my edges completely (no leave-out)",
  not_sure: "Not sure yet",
};

export const HEAT_BLEND_METHODS = ["heat_flat_iron", "blow_dry_tension"];
export const NO_HEAT_BLEND_METHODS = ["no_heat_banding", "no_heat_rollers"];

export const LEAVE_OUT_AMOUNT_LABELS: Record<string, string> = {
  none: "None - fully covered (glueless or full glue)",
  edges_only: "Edges only (1-2 inches at the hairline)",
  small_section: "A small section",
  larger_section: "A larger leave-out section",
};

export const WEAR_SCHEDULE_LABELS: Record<string, string> = {
  full_time: "Full time - I wear it every day",
  remove_nightly: "I remove it every night",
  few_days_week: "A few days a week",
  occasional: "Occasionally for events",
};

// install_duration_weeks is stored as an integer (the range's lower
// bound) since the DB column is a plain integer, not an enum/text -
// these labels are the inverse mapping for display.
export const INSTALL_DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1-2 weeks" },
  { value: 3, label: "3-4 weeks" },
  { value: 5, label: "5-8 weeks" },
  { value: 8, label: "8+ weeks" },
];

export const ADHESIVE_TYPE_OPTIONS = [
  { value: "wig_glue", label: "Wig glue or adhesive" },
  { value: "bold_hold_gel", label: "Bold hold or extreme hold gel" },
  { value: "double_sided_tape", label: "Double-sided tape" },
  { value: "elastic_combs", label: "Elastic band and combs (no glue)" },
  { value: "clips_only", label: "Clips only" },
];

// Only these two imply real adhesive is in play (drives uses_adhesive and
// the adhesive-removal-routine/product warnings) - elastic/clips don't.
const TRUE_ADHESIVE_METHODS = new Set(["wig_glue", "bold_hold_gel", "double_sided_tape"]);

export function adhesiveMethodsImplyAdhesive(methods: string[]): boolean {
  return methods.some((m) => TRUE_ADHESIVE_METHODS.has(m));
}

// extension_profiles.adhesive_type has a pre-existing CHECK constraint
// (discovered by probing, like extension_types - see
// ExtensionProfileForm.tsx) that only accepts a single value from
// {"bold_hold", "tape", "elastic_band", "none"} - it does not accept a
// comma-joined list, and there's no separate "glue" value distinct from
// "bold_hold". The form's Section 6 stays a multi-select checkbox group
// per spec, but collapses to one representative DB value on save,
// prioritizing whichever method carries the most safety-relevant meaning
// (real adhesive > tape > elastic > none) since that's what drives the
// adhesive-removal routine and product warnings downstream.
const ADHESIVE_METHOD_TO_DB: Record<string, string> = {
  wig_glue: "bold_hold",
  bold_hold_gel: "bold_hold",
  double_sided_tape: "tape",
  elastic_combs: "elastic_band",
  clips_only: "none",
};
const DB_ADHESIVE_PRIORITY = ["bold_hold", "tape", "elastic_band", "none"];

export function toDbAdhesiveType(methods: string[]): string | null {
  if (methods.length === 0) return null;
  const dbValues = methods.map((m) => ADHESIVE_METHOD_TO_DB[m]).filter((v): v is string => Boolean(v));
  for (const p of DB_ADHESIVE_PRIORITY) {
    if (dbValues.includes(p)) return p;
  }
  return dbValues[0] ?? null;
}

const DB_ADHESIVE_TO_METHOD: Record<string, string> = {
  bold_hold: "bold_hold_gel",
  tape: "double_sided_tape",
  elastic_band: "elastic_combs",
  none: "clips_only",
};

// Lossy on purpose - the DB only kept one collapsed value, so editing an
// existing profile can only re-select the one UI checkbox that maps back
// to it, not whichever original combination produced it.
export function fromDbAdhesiveType(dbValue: string | null): string[] {
  if (!dbValue) return [];
  const method = DB_ADHESIVE_TO_METHOD[dbValue];
  return method ? [method] : [];
}

// ---- /search page quick filters (item 7) -----------------------------
//
// There's no dedicated per-product "extension safety" score in the
// catalog - rather than building a whole new scoring pipeline, this
// reuses the ingredient matches /search already computes for the user's
// hair profile (ScoreResult.matches) and checks ingredient names against
// the same oil/silicone/sulfate concerns called out throughout the
// routine content (lib/extensionRoutineSteps.ts's tape-in avoid list,
// wig sulfate-free guidance, synthetic no-conditioner rule). "Adhesive
// remover" isn't a safety check at all - it's a literal product search.
export const EXTENSION_SEARCH_FILTERS = [
  { key: "wig_safe", label: "Wig safe" },
  { key: "tape_in_safe", label: "Tape-in safe" },
  { key: "bond_safe", label: "Bond safe" },
  { key: "synthetic_safe", label: "Synthetic safe" },
  { key: "adhesive_remover", label: "Adhesive remover" },
] as const;

export type ExtensionSearchFilterKey = (typeof EXTENSION_SEARCH_FILTERS)[number]["key"];

const BOND_UNSAFE_KEYWORDS = ["oil", "silicone", "mineral oil", "petrolatum"];
const SYNTHETIC_UNSAFE_KEYWORDS = ["silicone", "dimethicone", "conditioning", "oil"];
const SULFATE_KEYWORDS = ["sodium lauryl sulfate", "sodium laureth sulfate", "sulfate"];

// True = this product's known ingredients raise no flags for the given
// filter. Products with no scored ingredients yet (still loading, or
// scoring failed) are treated as safe by default - absence of a red flag
// rather than a false positive, since the alternative is punishing every
// product before its score has finished loading.
export function isProductSafeForExtensionFilter(
  ingredientNames: string[],
  filter: ExtensionSearchFilterKey
): boolean {
  if (filter === "adhesive_remover") return true; // handled as a name search instead, not a safety check
  const names = ingredientNames.map((n) => n.toLowerCase());
  if (filter === "wig_safe") {
    return !names.some((n) => SULFATE_KEYWORDS.some((kw) => n.includes(kw)));
  }
  if (filter === "tape_in_safe" || filter === "bond_safe") {
    return !names.some((n) => BOND_UNSAFE_KEYWORDS.some((kw) => n.includes(kw)));
  }
  if (filter === "synthetic_safe") {
    return !names.some((n) => SYNTHETIC_UNSAFE_KEYWORDS.some((kw) => n.includes(kw)));
  }
  return true;
}
