import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildScoringProfile, scoreCatalogProductsForProfile, scoreTier } from "@/lib/compatibility";

// Server-only (imports getSupabaseAdmin) - the new home page's stats
// strip and "how the score works" section (see app/page.tsx).

export type HomeStats = {
  productCount: number;
  ingredientCount: number;
};

// "400+ products scored / 850+ ingredients analyzed" - live counts
// rather than hardcoded copy, so this never goes stale. "8 variables per
// score" is a fixed fact about the scoring algorithm itself (curl
// type/family, porosity, scalp condition, climate, water hardness,
// color-treated, hair concerns, product category/weight), not a count of
// anything in the database - left as a literal in app/page.tsx.
export async function getHomeStats(): Promise<HomeStats> {
  const admin = getSupabaseAdmin();
  const [{ count: productCount }, { count: ingredientCount }] = await Promise.all([
    admin.from("catalog_products").select("*", { count: "exact", head: true }),
    admin.from("ingredients").select("*", { count: "exact", head: true }),
  ]);
  return {
    productCount: productCount ?? 0,
    ingredientCount: ingredientCount ?? 0,
  };
}

// "The same product, three different scores" (section 3) - curated
// content, not a live feed. To feature a different product, change only
// the two constants below; everything else (the three scores) is
// computed live against the real scoring engine so the numbers shown are
// always genuinely correct for that product, never hand-typed and
// possibly wrong.
const FEATURED_PRODUCT_NAME = "Curl Maker";
const FEATURED_BRAND_NAME = "Camille Rose";

export type FeaturedScoreExample = {
  productName: string;
  brandName: string;
  rows: {
    label: string; // "4a high porosity · atlanta"
    score: number;
    tier: "green" | "amber" | "red";
  }[];
};

// Three representative profiles matching the request's own literal
// example - climate values are lib/locationFactors.ts's real ClimateZone
// strings for each named city (Atlanta/Chicago -> humid/cold-dry per
// lib/climateData.ts's state and zip3 overrides; "dry climate" is stated
// directly in the third row, so no city is needed there).
const EXAMPLE_PROFILES: { label: string; curlType: string; porosity: string | null; climate: string }[] = [
  { label: "4a high porosity · atlanta", curlType: "4a", porosity: "high", climate: "humid" },
  { label: "2b low porosity · chicago", curlType: "2b", porosity: "low", climate: "cold-dry" },
  { label: "1b fine · dry climate", curlType: "1b", porosity: null, climate: "dry" },
];

export async function getFeaturedScoreExample(): Promise<FeaturedScoreExample | null> {
  const admin = getSupabaseAdmin();
  const { data: productRow } = await admin
    .from("catalog_products")
    .select("id, name, catalog_brands!inner(name)")
    .eq("name", FEATURED_PRODUCT_NAME)
    .eq("catalog_brands.name", FEATURED_BRAND_NAME)
    .maybeSingle();

  if (!productRow) return null;

  const rows = await Promise.all(
    EXAMPLE_PROFILES.map(async (example) => {
      const profile = buildScoringProfile(
        {
          curl_type: example.curlType,
          porosity: example.porosity,
          scalp_condition: null,
          climate: null,
          water_hardness: null,
        },
        example.climate
      );
      const outcomes = await scoreCatalogProductsForProfile([productRow.id], profile);
      const result = outcomes[productRow.id]?.result;
      return result
        ? { label: example.label, score: result.normalizedScore, tier: scoreTier(result.normalizedScore) }
        : null;
    })
  );

  const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (validRows.length === 0) return null;

  return {
    productName: productRow.name,
    brandName: FEATURED_BRAND_NAME,
    rows: validRows,
  };
}
