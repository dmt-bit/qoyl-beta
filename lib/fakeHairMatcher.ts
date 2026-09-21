import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { slugifyStyleName } from "@/lib/brandCatalogProducts";
import type { HairAdditionPreference } from "@/lib/hairAdditionPreference";

// Server-only (service-role reads of fake_hair_products/color_compatibility,
// which are shared with qoyl-business). Reached from the client shopping
// list through app/api/style-match/fake-hair-products, never imported into
// a "use client" file except as a type.

export type FakeHairMatchInput = {
  styleName: string;
  hairPreference: HairAdditionPreference | null;
  curlType: string | null;
  // Free text from the photo analysis or the profile's color_type.
  hairColor: string | null;
  // Free text ("long", "shoulder length") used only to pick a pack count.
  hairLength: string | null;
  limit?: number;
};

export type FakeHairMatch = {
  id: string;
  brand_account_id: string;
  brand_name: string;
  product_name: string;
  hair_type: string | null;
  hair_preference: string | null;
  price_per_pack_usd: number | null;
  can_be_heat_styled: boolean;
  product_url: string;
  packs_recommended: number | null;
  packs_length_label: string | null;
  is_featured: boolean;
  placement_type: "catalog_match" | "generic_amazon";
  color_matched: boolean;
  matched_color: string | null;
  score: number;
  shed_rating: number | null;
};

type ProductRow = {
  id: string;
  brand_id: string;
  product_name: string;
  hair_type: string | null;
  compatible_styles: string[] | null;
  blends_with_curl_types: string[] | null;
  available_colors: string[] | null;
  price_per_pack_usd: number | null;
  packs_needed_by_length: Record<string, number> | null;
  can_be_heat_styled: boolean | null;
  hair_preference: string | null;
  product_url: string | null;
  amazon_asin: string | null;
  shed_rating: number | null;
  fake_hair_brand_accounts: { company_name: string; tier: string | null; status: string } | null;
};

const PREFERENCE_TO_MATERIAL: Record<string, string> = {
  human_hair_only: "human",
  synthetic_only: "synthetic",
  heat_resistant_synthetic: "heat_resistant_synthetic",
};

const norm = (s: string) => s.toLowerCase().trim().replace(/[\s-]+/g, "_");

export function hairColorFamily(text: string | null): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  // Order matters: "copper red / auburn" must hit auburn before red.
  if (/auburn|copper/.test(t)) return "auburn";
  if (/red|burgundy|ginger/.test(t)) return "red";
  if (/blond|honey|platinum/.test(t)) return "blonde";
  if (/gr[ae]y|silver|white/.test(t)) return "gray";
  if (/dark brown|espresso|chocolate/.test(t)) return "dark_brown";
  if (/brown|chestnut|caramel/.test(t)) return "brown";
  if (/black|jet/.test(t)) return "black";
  return null;
}

// Heuristic: the style's hair_length text -> which packs_needed_by_length
// bucket to quote. Defaults to bra_strap when unknown.
function lengthBucket(text: string | null): { key: string; label: string } {
  const t = (text ?? "").toLowerCase();
  if (/hip|extra|very long/.test(t)) return { key: "hip", label: "hip length" };
  if (/waist/.test(t)) return { key: "waist", label: "waist length" };
  if (/short|shoulder|chin|bob/.test(t)) return { key: "shoulder", label: "shoulder length" };
  if (/long/.test(t)) return { key: "waist", label: "waist length" };
  return { key: "bra_strap", label: "bra-strap length" };
}

function productUrl(row: ProductRow): string | null {
  return row.product_url ?? (row.amazon_asin ? `https://www.amazon.com/dp/${row.amazon_asin}` : null);
}

// Matching: style -> hair type -> scoring, then tier-aware ordering.
export async function matchFakeHairProducts(input: FakeHairMatchInput): Promise<FakeHairMatch[]> {
  if (input.hairPreference === "natural_hair_only") return [];
  const admin = getSupabaseAdmin();

  // 1. Style. compatible_styles are seller-entered (box_braids, ...), so
  //    compare against both slug spellings plus an all-styles wildcard.
  const slug = slugifyStyleName(input.styleName);
  const candidates = Array.from(new Set([slug, norm(slug), norm(input.styleName), "all-styles", "all_styles"]));

  const { data, error } = await admin
    .from("fake_hair_products")
    .select(
      "id, brand_id, product_name, hair_type, compatible_styles, blends_with_curl_types, available_colors, price_per_pack_usd, packs_needed_by_length, can_be_heat_styled, hair_preference, product_url, amazon_asin, shed_rating, fake_hair_brand_accounts(company_name, tier, status)"
    )
    .eq("in_stock", true)
    .overlaps("compatible_styles", candidates);

  if (error || !data) {
    console.error("[fakeHairMatcher] product query failed:", error);
    return [];
  }

  const activeRows = (data as unknown as ProductRow[]).filter(
    (r) =>
      r.fake_hair_brand_accounts &&
      ["approved", "active"].includes(r.fake_hair_brand_accounts.status) &&
      productUrl(r)
  );

  // 2. Hair type (material). A product with no stated material passes.
  const material = input.hairPreference ? PREFERENCE_TO_MATERIAL[input.hairPreference] : undefined;
  const typed = activeRows.filter((r) => !material || !r.hair_preference || r.hair_preference === material);
  if (typed.length === 0) return [];

  // 3. Scoring: curl-type blend + color match.
  const family = hairColorFamily(input.hairColor);
  const colorScores = new Map<string, number>();
  if (family) {
    const { data: colors } = await admin
      .from("color_compatibility")
      .select("product_color, match_score")
      .eq("hair_color_family", family);
    for (const c of colors ?? []) colorScores.set(String(c.product_color).toLowerCase(), c.match_score);
  }

  const bucket = lengthBucket(input.hairLength);

  const scored: (FakeHairMatch & { _tierRank: number })[] = typed.map((r) => {
    let score = 0;
    if (input.curlType && (r.blends_with_curl_types ?? []).includes(input.curlType)) score += 30;

    let matchedColor: string | null = null;
    let best = 0;
    for (const color of r.available_colors ?? []) {
      const s = colorScores.get(color.toLowerCase()) ?? 0;
      if (s > best) {
        best = s;
        matchedColor = color;
      }
    }
    const colorMatched = matchedColor !== null;
    if (colorMatched) score += Math.round(best / 2);

    const packs = r.packs_needed_by_length?.[bucket.key];
    const tier = r.fake_hair_brand_accounts!.tier;
    return {
      id: r.id,
      brand_account_id: r.brand_id,
      brand_name: r.fake_hair_brand_accounts!.company_name,
      product_name: r.product_name,
      hair_type: r.hair_type,
      hair_preference: r.hair_preference,
      price_per_pack_usd: r.price_per_pack_usd,
      can_be_heat_styled: r.can_be_heat_styled === true,
      product_url: productUrl(r)!,
      packs_recommended: typeof packs === "number" ? packs : null,
      packs_length_label: typeof packs === "number" ? bucket.label : null,
      is_featured: tier === "featured",
      placement_type: "catalog_match",
      color_matched: colorMatched,
      matched_color: matchedColor,
      score,
      shed_rating: r.shed_rating,
      _tierRank: tier === "featured" ? 1 : 0,
    };
  });

  // Ordering. Featured sellers sort first WITHIN the matched pool, but a
  // color match outranks tier whenever we know the shopper's hair color, so
  // a featured seller with no color match still ranks below a standard seller
  // with one ("featured surfaces on top only when matched"). When hair color
  // is unknown nobody can color-match, so tier is simply the first key. Then
  // score desc, then shed_rating asc (lower is better; unrated last).
  const colorKnown = family !== null;
  scored.sort((a, b) => {
    if (colorKnown && a.color_matched !== b.color_matched) return a.color_matched ? -1 : 1;
    if (a._tierRank !== b._tierRank) return b._tierRank - a._tierRank;
    if (a.score !== b.score) return b.score - a.score;
    return (a.shed_rating ?? 99) - (b.shed_rating ?? 99);
  });

  return scored.slice(0, input.limit ?? 4).map((m) => {
    const rest: Partial<typeof m> = { ...m };
    delete rest._tierRank;
    return rest as FakeHairMatch;
  });
}
