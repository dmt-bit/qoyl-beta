// Derives two hair_profiles fields from a US zip code: climate and
// water_hardness. Both are heuristic approximations, not precise
// per-address measurements - documented at each function so that's
// obvious to whoever reads this next, not just implied.

export type ClimateZone = "humid" | "dry" | "cold-dry" | "tropical";
export const CLIMATE_ZONES: readonly ClimateZone[] = ["humid", "dry", "cold-dry", "tropical"];
export type WaterHardness = "hard" | "moderate" | "soft";

export const CLIMATE_LABELS: Record<ClimateZone, string> = {
  humid: "Humid",
  tropical: "Tropical",
  dry: "Dry",
  "cold-dry": "Cold & dry",
};

export const WATER_HARDNESS_LABELS: Record<WaterHardness, string> = {
  hard: "Hard",
  moderate: "Moderate",
  soft: "Soft",
};

// Standard USPS zip-code-prefix-to-state allocation (the first 3 digits
// of a US zip code fall within well-known, stable ranges per state).
// Approximate at the boundaries between neighboring states/prefixes -
// acceptable here since this only ever feeds a regional water-hardness
// bucket, not anything precision-critical.
const ZIP3_STATE_RANGES: { min: number; max: number; state: string }[] = [
  { min: 6, max: 9, state: "PR" },
  { min: 10, max: 27, state: "MA" },
  { min: 28, max: 29, state: "RI" },
  { min: 30, max: 38, state: "NH" },
  { min: 39, max: 49, state: "ME" },
  { min: 50, max: 59, state: "VT" },
  { min: 60, max: 69, state: "CT" },
  { min: 70, max: 89, state: "NJ" },
  { min: 100, max: 149, state: "NY" },
  { min: 150, max: 196, state: "PA" },
  { min: 197, max: 199, state: "DE" },
  { min: 200, max: 205, state: "DC" },
  { min: 206, max: 219, state: "MD" },
  { min: 220, max: 246, state: "VA" },
  { min: 247, max: 268, state: "WV" },
  { min: 270, max: 289, state: "NC" },
  { min: 290, max: 299, state: "SC" },
  { min: 300, max: 319, state: "GA" },
  { min: 320, max: 349, state: "FL" },
  { min: 350, max: 369, state: "AL" },
  { min: 370, max: 385, state: "TN" },
  { min: 386, max: 397, state: "MS" },
  { min: 398, max: 399, state: "GA" },
  { min: 400, max: 427, state: "KY" },
  { min: 430, max: 458, state: "OH" },
  { min: 460, max: 479, state: "IN" },
  { min: 480, max: 499, state: "MI" },
  { min: 500, max: 528, state: "IA" },
  { min: 530, max: 549, state: "WI" },
  { min: 550, max: 567, state: "MN" },
  { min: 570, max: 577, state: "SD" },
  { min: 580, max: 588, state: "ND" },
  { min: 590, max: 599, state: "MT" },
  { min: 600, max: 629, state: "IL" },
  { min: 630, max: 658, state: "MO" },
  { min: 660, max: 679, state: "KS" },
  { min: 680, max: 693, state: "NE" },
  { min: 700, max: 715, state: "LA" },
  { min: 716, max: 729, state: "AR" },
  { min: 730, max: 749, state: "OK" },
  { min: 750, max: 799, state: "TX" },
  { min: 800, max: 816, state: "CO" },
  { min: 820, max: 831, state: "WY" },
  { min: 832, max: 838, state: "ID" },
  { min: 840, max: 847, state: "UT" },
  { min: 850, max: 865, state: "AZ" },
  { min: 870, max: 884, state: "NM" },
  { min: 889, max: 898, state: "NV" },
  { min: 900, max: 966, state: "CA" },
  { min: 967, max: 968, state: "HI" },
  { min: 970, max: 979, state: "OR" },
  { min: 980, max: 994, state: "WA" },
  { min: 995, max: 999, state: "AK" },
];

export function stateFromZipCode(zip: string): string | null {
  const digits = zip.trim().slice(0, 3);
  if (!/^\d{3}$/.test(digits)) return null;
  const prefix = parseInt(digits, 10);

  const match = ZIP3_STATE_RANGES.find(
    (r) => prefix >= r.min && prefix <= r.max
  );
  return match?.state ?? null;
}
