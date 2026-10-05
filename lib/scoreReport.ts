import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildScoringProfile,
  scoreCatalogProductsForProfile,
  scoreTier,
  type ScoreResult,
} from "@/lib/compatibility";

// Brand score report - the same scoring engine the consumer app uses,
// run across representative hair profiles for a brand's product. Served
// to qoyl-business via /api/internal/score-report (see that route); this
// module holds all the logic so the route stays a thin auth wrapper.

export const TEST_PROFILES = [
  { curl_type: "4b", porosity: "high", climate: "humid", scalp: "normal" },
  { curl_type: "4b", porosity: "low", climate: "cold-dry", scalp: "normal" },
  { curl_type: "3b", porosity: "medium", climate: "humid", scalp: "normal" },
  { curl_type: "2b", porosity: "low", climate: "dry", scalp: "normal" },
  { curl_type: "1b", porosity: "medium", climate: "dry", scalp: "normal" },
  { curl_type: "4c", porosity: "high", climate: "tropical", scalp: "dry" },
] as const;

export type TestProfile = (typeof TEST_PROFILES)[number];

// Cap on how many same-category products the percentile is computed
// against. Each one is scored once per test profile, so this bounds the
// cost of a single report.
const PERCENTILE_POOL_CAP = 300;

function profileLabel(p: TestProfile): string {
  return `${p.curl_type} · ${p.porosity} porosity · ${p.climate}`;
}

// Builds the scoring profile the same way the consumer app does
// (buildScoringProfile) - the test profile fields map onto the same row
// shape a real hair_profiles row has.
function toScoringProfile(p: TestProfile) {
  return buildScoringProfile(
    {
      curl_type: p.curl_type,
      porosity: p.porosity,
      scalp_condition: p.scalp,
      climate: p.climate,
      water_hardness: null,
    },
    p.climate
  );
}

export type ProfileOutcome = {
  profile: TestProfile;
  label: string;
  score: number;
  tier: "green" | "amber" | "red";
};

export type IngredientRow = {
  position: number;
  inciName: string;
  primaryFunction: string | null;
  // Rating under each representative porosity (see REPRESENTATIVE below).
  ratings: { high: string | null; medium: string | null; low: string | null };
  flag: string | null;
};

export type ScoreReport =
  | { status: "not_in_catalog"; message: string }
  | {
      status: "ok";
      product: { id: string; name: string; brand: string; category: string | null };
      profiles: ProfileOutcome[];
      averageScore: number;
      topSegments: ProfileOutcome[];
      bottomSegments: ProfileOutcome[];
      // Share of same-category products this product's average beats.
      percentile: number | null;
      percentileSampleSize: number;
      ingredients: IngredientRow[];
      keyFinding: string;
    };

// Matches the ingredient breakdown to a single profile per porosity.
const REPRESENTATIVE = {
  high: TEST_PROFILES[0],
  low: TEST_PROFILES[1],
  medium: TEST_PROFILES[2],
} as const;

async function findProduct(productName: string, brandName: string | null) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("catalog_products")
    .select("id, name, category_id, catalog_brands(name), categories(slug)")
    .ilike("name", `%${productName.trim()}%`)
    .limit(25);
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    name: string;
    category_id: string | null;
    catalog_brands: { name: string } | { name: string }[] | null;
    categories: { slug: string } | { slug: string }[] | null;
  };
  const rows = (data ?? []) as Row[];
  const brandOf = (r: Row) => {
    const b = Array.isArray(r.catalog_brands) ? r.catalog_brands[0] : r.catalog_brands;
    return b?.name ?? "";
  };
  const candidates = brandName
    ? rows.filter((r) => brandOf(r).toLowerCase() === brandName.trim().toLowerCase())
    : rows;
  const exact = candidates.find((r) => r.name.toLowerCase() === productName.trim().toLowerCase());
  return exact ?? candidates[0] ?? null;
}

async function scoreAcrossProfiles(productIds: string[]) {
  const perProfile = await Promise.all(
    TEST_PROFILES.map((p) => scoreCatalogProductsForProfile(productIds, toScoringProfile(p)))
  );
  return perProfile;
}

function percentileOf(value: number, pool: number[]): number | null {
  if (pool.length === 0) return null;
  const below = pool.filter((v) => v < value).length;
  return Math.round((below / pool.length) * 100);
}

function keyFindingFor(
  name: string,
  profiles: ProfileOutcome[],
  averageScore: number
): string {
  const sorted = [...profiles].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const gap = best.score - worst.score;
  if (gap >= 40) {
    return `${name} is an excellent match for ${best.label} but significantly underperforms for ${worst.label}. the dashboard shows exactly which ingredient is driving that gap.`;
  }
  if (averageScore >= 70) {
    return `${name} performs well across hair types - the dashboard will show which segments to prioritize in your marketing.`;
  }
  if (averageScore < 40) {
    return `${name} has significant formulation gaps for most profiles in our database. the dashboard identifies the specific ingredients and the swaps that would close them.`;
  }
  return `${name} is a mixed match - it works for some profiles and not others. the dashboard shows which segments are strongest and which ingredient costs the most in the rest.`;
}

export async function buildScoreReport(
  productName: string,
  brandName: string | null
): Promise<ScoreReport> {
  const product = await findProduct(productName, brandName);
  if (!product) {
    return {
      status: "not_in_catalog",
      message: `add ${productName} to the catalog at /admin/products first, then run the score report`,
    };
  }

  const brand = Array.isArray(product.catalog_brands)
    ? product.catalog_brands[0]?.name
    : product.catalog_brands?.name;
  const category = Array.isArray(product.categories)
    ? product.categories[0]?.slug ?? null
    : product.categories?.slug ?? null;

  const [ownScores, categoryRows] = await Promise.all([
    scoreAcrossProfiles([product.id]),
    product.category_id
      ? getSupabaseAdmin()
          .from("catalog_products")
          .select("id")
          .eq("category_id", product.category_id)
          .neq("id", product.id)
          .limit(PERCENTILE_POOL_CAP)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
  ]);

  const profiles: ProfileOutcome[] = TEST_PROFILES.map((p, i) => {
    const result = ownScores[i][product.id]?.result;
    const score = result?.normalizedScore ?? 0;
    return { profile: p, label: profileLabel(p), score, tier: scoreTier(score) };
  });
  const averageScore = Math.round(profiles.reduce((s, p) => s + p.score, 0) / profiles.length);

  // Percentile: this product's average across the six profiles vs. the
  // same average for other products in the category. Scored only when the
  // category has a pool to compare against.
  const poolIds = (categoryRows.data ?? []).map((r) => r.id);
  let percentile: number | null = null;
  if (poolIds.length > 0) {
    const poolScores = await scoreAcrossProfiles(poolIds);
    const poolAverages = poolIds.map((id) => {
      const scores = poolScores.map((perProfile) => perProfile[id]?.result?.normalizedScore ?? 0);
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    });
    percentile = percentileOf(averageScore, poolAverages);
  }

  const sorted = [...profiles].sort((a, b) => b.score - a.score);

  // Ingredient breakdown: the first 10 positions from the high/low/medium
  // representative profiles. Flags call out anything rated caution/avoid.
  const matchesFor = (key: keyof typeof REPRESENTATIVE) => {
    const idx = TEST_PROFILES.indexOf(REPRESENTATIVE[key]);
    const result: ScoreResult | undefined = ownScores[idx][product.id]?.result;
    return result?.matches ?? [];
  };
  const byPorosity = {
    high: matchesFor("high"),
    low: matchesFor("low"),
    medium: matchesFor("medium"),
  };
  const topPositions = [...byPorosity.high].sort((a, b) => a.position - b.position).slice(0, 10);
  const ingredients: IngredientRow[] = topPositions.map((m) => {
    const find = (list: typeof byPorosity.high) =>
      list.find((x) => x.inciName === m.inciName)?.rating ?? null;
    const ratings = {
      high: find(byPorosity.high),
      medium: find(byPorosity.medium),
      low: find(byPorosity.low),
    };
    const risky = Object.values(ratings).some((r) => r === "caution" || r === "avoid");
    return {
      position: m.position,
      inciName: m.inciName,
      primaryFunction: m.primaryFunction,
      ratings,
      flag: risky ? "caution for some hair profiles" : null,
    };
  });

  return {
    status: "ok",
    product: { id: product.id, name: product.name, brand: brand ?? "", category },
    profiles,
    averageScore,
    topSegments: sorted.slice(0, 3),
    bottomSegments: sorted.slice(-3).reverse(),
    percentile,
    percentileSampleSize: poolIds.length,
    ingredients,
    keyFinding: keyFindingFor(product.name, profiles, averageScore),
  };
}
