// Static water-hardness classification by zip code prefix, replacing the
// earlier state-level lookup (a whole state is a poor proxy -- Chicago
// and downstate Illinois don't share a water source, let alone a
// hardness level). This is a sparse table of specific, well-documented
// metro areas from published municipal water quality reports -- not
// full national zip3 coverage. Anything not explicitly listed here
// falls back to "moderate", which lib/compatibility.ts's scoring
// treats as a no-op (same as soft): an area we have no real data for
// should never wrongly boost or penalize a score.
//
// Two ranges the source list gave as "soft/moderate" needed a single
// definitive bucket since the type only allows one: Boston (021-022)
// went to "soft" (MWRA's reservoir-sourced surface water is well
// documented as soft); the SF Bay Area (940-948) went to "moderate"
// instead -- that range spans multiple water districts with genuinely
// mixed hardness (SF proper's Hetch Hetchy supply is soft, but South
// Bay/Peninsula draws more from harder groundwater), so "moderate" is
// the safer average across it rather than picking one extreme.

import { WaterHardness } from "@/lib/locationFactors";

const ZIP3_WATER_HARDNESS_RANGES: {
  min: number;
  max: number;
  hardness: WaterHardness;
  region: string;
}[] = [
  // Hard (>120 mg/L calcium carbonate)
  { min: 606, max: 612, hardness: "hard", region: "Chicago & IL suburbs" },
  { min: 850, max: 853, hardness: "hard", region: "Phoenix/Scottsdale" },
  { min: 889, max: 891, hardness: "hard", region: "Las Vegas" },
  { min: 750, max: 762, hardness: "hard", region: "Dallas/Fort Worth" },
  { min: 770, max: 774, hardness: "hard", region: "Houston" },
  { min: 800, max: 802, hardness: "hard", region: "Denver" },
  { min: 460, max: 462, hardness: "hard", region: "Indianapolis" },
  { min: 640, max: 641, hardness: "hard", region: "Kansas City" },
  { min: 782, max: 782, hardness: "hard", region: "San Antonio" },
  { min: 554, max: 559, hardness: "hard", region: "Minneapolis/St. Paul" },

  // Soft (<60 mg/L)
  { min: 980, max: 986, hardness: "soft", region: "Seattle/Pacific NW" },
  { min: 970, max: 972, hardness: "soft", region: "Portland, OR" },
  { min: 303, max: 303, hardness: "soft", region: "Atlanta" },
  { min: 700, max: 701, hardness: "soft", region: "New Orleans" },
  { min: 21, max: 22, hardness: "soft", region: "Boston" },
  { min: 380, max: 381, hardness: "soft", region: "Memphis" },

  // Moderate (60-120 mg/L)
  { min: 100, max: 104, hardness: "moderate", region: "New York City" },
  { min: 900, max: 902, hardness: "moderate", region: "Los Angeles" },
  { min: 331, max: 334, hardness: "moderate", region: "Miami" },
  { min: 940, max: 948, hardness: "moderate", region: "SF Bay Area" },
];

export function waterHardnessFromZip(zip: string): WaterHardness {
  const digits = zip.trim().slice(0, 3);
  if (!/^\d{3}$/.test(digits)) return "moderate";
  const prefix = parseInt(digits, 10);

  const match = ZIP3_WATER_HARDNESS_RANGES.find(
    (r) => prefix >= r.min && prefix <= r.max
  );
  return match?.hardness ?? "moderate";
}
