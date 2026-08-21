// Static climate classification by zip code - replaces an earlier
// version of this feature that called wttr.in for live weather and
// derived climate from same-day conditions (which meant results shifted
// with the weather and could misclassify a normally-dry city on a rare
// humid day). This is instant, offline, and stable year-round.
//
// Important about how this table was actually built: the request that
// produced it asked for a real NOAA 30-year-normals + Census zip-to-
// county crosswalk join. That's not something this environment can do -
// there's no network access here to download and process those
// datasets. What's here instead is a hand-curated approximation at the
// state level (with a few explicit sub-state overrides for well-known
// exceptions, e.g. Chicago's winters vs. the rest of Illinois): every
// state is bucketed into one of the four climate zones using general,
// well-established climate knowledge, following the same humid/
// tropical/dry/cold-dry definitions and worked examples given in the
// original request. It's a reasonable, stable approximation - not a
// literal join of the named federal datasets, and it inherits all the
// coarseness that implies (a single bucket per state is obviously wrong
// for large, climatically diverse states; the overrides list below only
// covers the handful of cases that matter enough to call out by name).

import { ClimateZone, stateFromZipCode } from "@/lib/locationFactors";

// Checked before the state-level default - for regions where a whole
// state's default bucket would be misleading for a large, well-known
// population center within it.
const ZIP3_CLIMATE_OVERRIDES: { min: number; max: number; climate: ClimateZone }[] = [
  // Chicago metro - cold, often-dry winters are when glycerin actually
  // causes problems for hair, so cold-dry is the more useful
  // classification here than Illinois's statewide humid-summers default.
  { min: 606, max: 608, climate: "cold-dry" },
  // Houston / Galveston - Gulf Coast humidity, not Texas's statewide dry
  // default.
  { min: 770, max: 779, climate: "humid" },
];

// One bucket per state - a simplification for large states (Texas,
// California, Alaska) whose climate varies far more than a single label
// can capture, but consistent with the coarse 4-bucket system this
// feeds. States not in this list (a couple of small/edge territories)
// fall back to "humid", the most common classification nationally.
const STATE_CLIMATE: Record<string, ClimateZone> = {
  // Tropical
  FL: "tropical",
  HI: "tropical",
  PR: "tropical",

  // Dry
  AZ: "dry",
  CA: "dry",
  CO: "dry",
  KS: "dry",
  NE: "dry",
  NM: "dry",
  NV: "dry",
  OK: "dry",
  SD: "dry",
  ND: "dry",
  TX: "dry",
  UT: "dry",

  // Cold & dry
  AK: "cold-dry",
  ID: "cold-dry",
  MN: "cold-dry",
  MT: "cold-dry",
  WY: "cold-dry",

  // Humid (Southeast, Mid-Atlantic, Midwest east of the Mississippi,
  // Northeast, Pacific Northwest)
  AL: "humid",
  AR: "humid",
  CT: "humid",
  DC: "humid",
  DE: "humid",
  GA: "humid",
  IA: "humid",
  IL: "humid",
  IN: "humid",
  KY: "humid",
  LA: "humid",
  MA: "humid",
  MD: "humid",
  ME: "humid",
  MI: "humid",
  MO: "humid",
  MS: "humid",
  NC: "humid",
  NH: "humid",
  NJ: "humid",
  NY: "humid",
  OH: "humid",
  OR: "humid",
  PA: "humid",
  RI: "humid",
  SC: "humid",
  TN: "humid",
  VA: "humid",
  VT: "humid",
  WA: "humid",
  WV: "humid",
  WI: "humid",
};

export function classifyClimateFromZip(zip: string): ClimateZone | null {
  const digits = zip.trim().slice(0, 3);
  if (!/^\d{3}$/.test(digits)) return null;
  const prefix = parseInt(digits, 10);

  const override = ZIP3_CLIMATE_OVERRIDES.find(
    (r) => prefix >= r.min && prefix <= r.max
  );
  if (override) return override.climate;

  const state = stateFromZipCode(zip);
  if (!state) return null;

  return STATE_CLIMATE[state] ?? "humid";
}

// Every state/territory code this table recognizes - used by
// lib/destinationClimate.ts to check whether a free-text travel
// destination (e.g. "Miami, FL") contains a real state abbreviation
// before trusting a match, rather than duplicating this list.
export const KNOWN_STATE_CODES: string[] = Object.keys(STATE_CLIMATE);

export function classifyClimateFromState(state: string): ClimateZone {
  return STATE_CLIMATE[state] ?? "humid";
}
