import { ClimateZone } from "@/lib/locationFactors";
import { KNOWN_STATE_CODES, classifyClimateFromState } from "@/lib/climateData";

// Best-effort classification of a free-text travel destination (e.g.
// "Miami, FL" or "Paris, France") into one of the four climate buckets
// already used for hair profile scoring. There's no geocoding/weather
// API available in this environment, so this is a heuristic, not a
// lookup against real climate data:
//   1. If the text contains a recognizable US state abbreviation, reuse
//      the exact same state->climate table the zip-code-based profile
//      detection already uses (lib/climateData.ts) -- keeps the two
//      forms of climate detection in this app consistent with each
//      other.
//   2. Otherwise, check a small curated list of major international
//      travel destinations, grouped by climate.
//   3. Otherwise, return null -- the UI falls back to asking the user
//      to pick a climate manually rather than silently guessing.
const KNOWN_STATE_CODE_SET = new Set(KNOWN_STATE_CODES);

const INTERNATIONAL_DESTINATIONS: { climate: ClimateZone; names: string[] }[] = [
  {
    climate: "tropical",
    names: [
      "cancun",
      "punta cana",
      "bali",
      "phuket",
      "singapore",
      "manila",
      "jamaica",
      "bahamas",
      "maldives",
      "rio de janeiro",
      "cartagena",
      "hawaii",
      "puerto rico",
      "costa rica",
      "panama",
    ],
  },
  {
    climate: "humid",
    names: [
      "paris",
      "london",
      "tokyo",
      "seoul",
      "amsterdam",
      "dublin",
      "vancouver",
      "hong kong",
      "shanghai",
      "new orleans",
      "atlanta",
      "houston",
      "miami",
      "jakarta",
      "mumbai",
      "bangkok",
      "ho chi minh",
      "lagos",
    ],
  },
  {
    climate: "dry",
    names: [
      "dubai",
      "cairo",
      "marrakech",
      "marrakesh",
      "phoenix",
      "las vegas",
      "doha",
      "abu dhabi",
      "santa fe",
      "albuquerque",
      "cape town",
      "perth",
      "los angeles",
      "san diego",
    ],
  },
  {
    climate: "cold-dry",
    names: [
      "reykjavik",
      "oslo",
      "moscow",
      "helsinki",
      "stockholm",
      "zurich",
      "banff",
      "aspen",
      "anchorage",
      "quebec city",
    ],
  },
];

export function classifyClimateFromDestination(
  destination: string
): ClimateZone | null {
  const text = destination.trim();
  if (!text) return null;

  const stateCodeMatches = text.toUpperCase().match(/\b[A-Z]{2}\b/g) ?? [];
  for (const code of stateCodeMatches) {
    if (KNOWN_STATE_CODE_SET.has(code)) {
      return classifyClimateFromState(code);
    }
  }

  const lower = text.toLowerCase();
  for (const group of INTERNATIONAL_DESTINATIONS) {
    if (group.names.some((name) => lower.includes(name))) {
      return group.climate;
    }
  }

  return null;
}
