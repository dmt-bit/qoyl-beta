// Shared across the profile form (pill options), compatibility scoring's
// age modifiers, routine step age-aware guidance, the dashboard chip, and
// home feed personalization - one ordering/label source so "and above"
// comparisons and display formatting can't drift between them.
//
// This describes hair_profiles.adult_age_range, which is deliberately a
// separate column/concept from the pre-existing age_range column (child/
// baby brackets like "0-12 months", "13+") - see
// supabase/add_adult_age_range.sql.

export const ADULT_AGE_RANGE_OPTIONS = [
  { value: "under_18", label: "Under 18" },
  { value: "18_25", label: "18 to 25" },
  { value: "26_35", label: "26 to 35" },
  { value: "36_45", label: "36 to 45" },
  { value: "46_55", label: "46 to 55" },
  { value: "56_65", label: "56 to 65" },
  { value: "65_plus", label: "65 and over" },
] as const;

export type AdultAgeRange = (typeof ADULT_AGE_RANGE_OPTIONS)[number]["value"];

const ORDER: AdultAgeRange[] = ADULT_AGE_RANGE_OPTIONS.map((o) => o.value);

// Compact form for chips/summaries, distinct from the form's fuller pill
// labels ("18 to 25") per the dashboard chip spec ("18-25", "46-55").
const CHIP_LABELS: Record<AdultAgeRange, string> = {
  under_18: "Under 18",
  "18_25": "18-25",
  "26_35": "26-35",
  "36_45": "36-45",
  "46_55": "46-55",
  "56_65": "56-65",
  "65_plus": "65+",
};

export function isAdultAgeRange(
  value: string | null | undefined
): value is AdultAgeRange {
  return !!value && (ORDER as string[]).includes(value);
}

// Null for both an unset profile and the "Prefer not to say" choice
// (which saves null, not a sentinel string) - callers that need to show
// a chip only for a real answer can just check truthiness of the result.
export function formatAdultAgeRange(
  value: string | null | undefined
): string | null {
  return isAdultAgeRange(value) ? CHIP_LABELS[value] : null;
}

// True when ageRange is at or above threshold in the adult bracket order
// - e.g. isAdultAgeAtLeast("56_65", "36_45") -> true. Used to layer "and
// above" guidance without repeating the ordering at every call site.
export function isAdultAgeAtLeast(
  ageRange: string | null | undefined,
  threshold: AdultAgeRange
): boolean {
  if (!isAdultAgeRange(ageRange)) return false;
  return ORDER.indexOf(ageRange) >= ORDER.indexOf(threshold);
}
