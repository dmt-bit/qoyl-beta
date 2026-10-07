import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildScoringProfile, curlFamily, scoreCatalogProductsForProfile } from "@/lib/compatibility";
import { CATEGORY_LABEL_BY_SLUG } from "@/lib/productCategories";
import { fetchBrandProductsForTravel, type BrandCatalogItem } from "@/lib/brandCatalogProducts";
import type { TravelSurveyData } from "@/lib/travelSurvey";

export type TravelKitProduct = {
  catalogProductId: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryLabel: string;
  score: number;
  reason: string;
  // Set only for a Qoyl Partner Brand pick (item 7) - lets the caller
  // (the Stripe webhook's PDF/email generation) badge it distinctly
  // from a regular catalog_products pick.
  isBrandProduct?: boolean;
  brandProductUrl?: string;
  brandShopperUrl?: string | null;
};

export type GenerateTravelKitInput = {
  userId: string;
  climate: string | null; // ClimateZone value, or "similar_to_home"
  survey: TravelSurveyData;
};

// One line of the kit. `slug` is always a real categories.slug - the
// builder's own names (scalp-oil, edge-control) are mapped in
// toCatalogSlug. `reason` is what the user sees under the product.
export type KitCategory = {
  slug: string;
  label: string;
  reason: string;
  // Non-product items (e.g. a satin bonnet) - listed by the builder but
  // never matched to a catalog product.
  isAccessory?: boolean;
};

// Builder names that aren't catalog categories. Anything not listed here
// is used as-is, and must exist in the categories table.
const CATALOG_SLUG_FOR: Record<string, string> = {
  "scalp-oil": "oil",
  "edge-control": "styler",
};

function toCatalogSlug(builderSlug: string): string {
  return CATALOG_SLUG_FOR[builderSlug] ?? builderSlug;
}

type ProfileForKit = { curl_type: string | null };

// Situation-aware kit builder. Each branch answers "what does this person
// need for this trip given how their hair will be?", and every item has a
// reason written for that situation.
export function buildKitCategories(survey: TravelSurveyData, profile: ProfileForKit): KitCategory[] {
  const categories: KitCategory[] = [];
  const family = curlFamily(profile.curl_type);

  // ---- WIG ----
  if (survey.hair_situation === "wig") {
    if (survey.wig_type === "human") {
      categories.push({
        slug: "shampoo",
        label: "wig shampoo",
        reason: "gentle shampoo for your human hair wig - sulfate-free to maintain the hair cuticle",
      });
      categories.push({
        slug: "conditioner",
        label: "wig conditioner",
        reason: "keeps human hair wigs soft and tangle-free between washes",
      });
    } else {
      // Synthetic (or unanswered - treated as synthetic)
      categories.push({
        slug: "styler",
        label: "wig refresh spray",
        reason: "synthetic wig spray or light styling product - do not use heat or heavy oils on synthetic fiber",
      });
    }

    if (survey.wig_adhesive === "glue") {
      categories.push({
        slug: "edge-control",
        label: "edge control",
        reason: "edge control for laying edges and securing the lace perimeter",
      });
    }
    if (survey.wig_adhesive === "got2b") {
      categories.push({
        slug: "styler",
        label: "hold spray",
        reason: "got2b or freeze spray for lace adhesion - travel size fits carry-on",
      });
    }

    if (survey.under_wig === "full_hair") {
      categories.push({
        slug: "leave-in",
        label: "leave-in for bio hair",
        reason: "your natural hair underneath still needs moisture - apply before putting on your wig",
      });
      categories.push({
        slug: "scalp-oil",
        label: "scalp oil",
        reason: "scalp oil keeps your natural hair healthy under the wig during the trip",
      });
    }
    if (survey.under_wig === "cornrows") {
      categories.push({
        slug: "scalp-oil",
        label: "scalp oil",
        reason: "scalp oil for the cornrows under your wig - prevents dryness between the braids",
      });
    }
    if (survey.under_wig === "minimal") {
      categories.push({
        slug: "scalp-treatment",
        label: "scalp treatment",
        reason: "lightweight scalp spray or serum for daily scalp care under the wig",
      });
    }

    // Listed for the trip, not a catalog product
    categories.push({
      slug: "accessories",
      label: "wig storage",
      reason: "satin bonnet or wig stand to store your wig at night - prevents tangling",
      isAccessory: true,
    });
  }

  // ---- EXTENSIONS ----
  else if (survey.hair_situation === "extensions") {
    if (survey.extension_type === "clip_in") {
      categories.push({
        slug: "shampoo",
        label: "shampoo",
        reason: "for washing your natural hair when clip-ins are removed",
      });
      categories.push({
        slug: "conditioner",
        label: "conditioner",
        reason: "condition your natural hair between clip-in sessions",
      });
      categories.push({
        slug: "leave-in",
        label: "leave-in",
        reason: "leave-in before reinstalling clip-ins each day",
      });
    }
    if (survey.extension_type === "permanent") {
      categories.push({
        slug: "dry-shampoo",
        label: "dry shampoo",
        reason: "refreshes the scalp between washes without disturbing your extensions",
      });
      categories.push({
        slug: "scalp-oil",
        label: "scalp oil",
        reason: "scalp oil keeps the scalp healthy without product buildup on the extension bonds",
      });
      if (survey.natural_under_extensions === "full") {
        categories.push({
          slug: "leave-in",
          label: "leave-in",
          reason: "lightweight leave-in for your natural hair - apply sparingly near the bonds",
        });
      }
    }
    if (survey.extension_type === "braiding_hair") {
      categories.push({
        slug: "scalp-oil",
        label: "scalp oil",
        reason: "daily scalp oil keeps your scalp from drying out under braids",
      });
      categories.push({
        slug: "leave-in",
        label: "leave-in",
        reason: "lightweight moisture for the length of your braiding hair",
      });
    }
  }

  // ---- PROTECTIVE STYLE ----
  else if (survey.hair_situation === "protective") {
    categories.push({
      slug: "scalp-oil",
      label: "scalp oil",
      reason: "daily scalp oil maintains scalp health under your protective style",
    });
    categories.push({
      slug: "leave-in",
      label: "leave-in",
      reason: "lightweight moisture for the length of your protective style",
    });
    if (survey.wash_plan && survey.wash_plan !== "none") {
      categories.push({
        slug: "shampoo",
        label: "shampoo",
        reason: "gentle shampoo for washing your protective style on the trip",
      });
    }
    if (survey.style_age === "older") {
      categories.push({
        slug: "scalp-treatment",
        label: "scalp refresh",
        reason: "scalp treatment or clarifying spray - your style is a few weeks old and may need a refresh",
      });
    }
  }

  // ---- MIX (wig some days, natural others) ----
  else if (survey.hair_situation === "mix") {
    categories.push({ slug: "shampoo", label: "shampoo", reason: "for your natural hair days" });
    categories.push({ slug: "leave-in", label: "leave-in", reason: "daily moisture for both natural and wig days" });
    categories.push({ slug: "oil", label: "sealant", reason: "seals moisture on natural hair days" });
    categories.push({
      slug: "edge-control",
      label: "edge control",
      reason: "for both laying edges on natural hair days and securing your wig",
    });
  }

  // ---- NATURAL ----
  else {
    const limitedWash = survey.wash_access === "limited" || survey.wash_access === "minimal";
    if (!limitedWash) {
      categories.push({ slug: "shampoo", label: "shampoo", reason: "your wash day essential" });
    } else {
      categories.push({
        slug: "dry-shampoo",
        label: "dry shampoo",
        reason: "refreshes roots without water - ideal for limited bathroom access",
      });
    }
    categories.push({ slug: "conditioner", label: "conditioner", reason: "rinse-out moisture after washing" });
    categories.push({ slug: "leave-in", label: "leave-in", reason: "daily moisture between wash days" });
    categories.push({ slug: "oil", label: "sealant oil", reason: "seals in moisture from your leave-in" });
    if (family === "curly" || family === "coily") {
      categories.push({ slug: "curl-cream", label: "curl cream", reason: "defines and holds your curl pattern" });
    } else {
      categories.push({ slug: "styler", label: "styler", reason: "light hold for styling on the trip" });
    }
  }

  const cap =
    survey.hair_situation === "wig" || survey.hair_situation === "extensions" || survey.hair_situation === "mix"
      ? 7
      : 5;

  // The base list is what the situation calls for, so it's the part that
  // gets capped. Swimming and scalp add-ons are specific needs for this
  // trip and go on after the cap, so they can't be cut to make room.
  const base = dedupeByCatalogSlug(categories)
    .filter((c) => !c.isAccessory)
    .slice(0, cap);

  const addOns: KitCategory[] = [];

  // Swimming (not for wigs, as before)
  const swims = survey.swimming && survey.swimming !== "no_swimming";
  if (swims && survey.hair_situation !== "wig") {
    addOns.push({
      slug: "treatment",
      label: "pre-swim treatment",
      reason: "apply before swimming to protect hair from chlorine or salt water",
    });
  }

  // Concerns. Only "scalp" is wired to a product today; the other concerns
  // are stored on the kit but don't change the list yet.
  if (survey.concerns.includes("scalp")) {
    const hasScalpItem = base.some((c) => c.slug === "scalp-oil" || c.slug === "scalp-treatment");
    if (!hasScalpItem) {
      addOns.push({
        slug: "scalp-treatment",
        label: "scalp treatment",
        reason: "for your scalp concerns during the trip",
      });
    }
  }

  return dedupeByCatalogSlug([...base, ...addOns]).filter((c) => !c.isAccessory);
}

// Catalog-slug de-duplication, first reason wins. Accessories pass through
// untouched (they're filtered out before products are picked).
function dedupeByCatalogSlug(items: KitCategory[]): KitCategory[] {
  const seen = new Set<string>();
  const out: KitCategory[] = [];
  for (const c of items) {
    if (c.isAccessory) {
      out.push(c);
      continue;
    }
    const mapped = toCatalogSlug(c.slug);
    if (seen.has(mapped)) continue;
    seen.add(mapped);
    out.push({ ...c, slug: mapped });
  }
  return out;
}

// Children's products don't belong in an adult travel kit. Matched on whole
// words in the product name, so "childhood" doesn't match "child".
const CHILDREN_NAME_PATTERN = /\b(kids?'?s?|children'?s?|baby|babies|toddlers?|child|junior)\b/i;

export function isChildrenProduct(name: string): boolean {
  return CHILDREN_NAME_PATTERN.test(name);
}

function brandItemToTravelKitProduct(
  item: BrandCatalogItem,
  categorySlug: string,
  reason: string
): TravelKitProduct {
  return {
    catalogProductId: item.id,
    name: item.name,
    brand: item.brandName,
    categorySlug,
    categoryLabel: CATEGORY_LABEL_BY_SLUG[categorySlug] ?? categorySlug,
    score: item.score ?? 0,
    reason,
    isBrandProduct: true,
    brandProductUrl: item.productUrl,
    brandShopperUrl: item.shopperUrl,
  };
}

// Server-side only - loads the user's hair profile with the service-role
// client, builds the kit's categories from the survey, and picks the
// best-scoring product per category (brand catalog first, then the main
// catalog). The climate is the trip's destination climate, not home.
// Returns fewer products than categories when a category has no usable
// product in the catalog.
export async function generateTravelKitProducts(
  input: GenerateTravelKitInput
): Promise<TravelKitProduct[]> {
  const admin = getSupabaseAdmin();

  const { data: profileRow, error: profileError } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, climate, water_hardness, color_treated")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (profileError || !profileRow) {
    console.error("[travel-kit-generator] Couldn't load hair profile:", input.userId, profileError);
    return [];
  }

  const tripClimate = input.climate === "similar_to_home" ? undefined : input.climate;
  const scoringProfile = buildScoringProfile(profileRow, tripClimate);

  const categories = buildKitCategories(input.survey, profileRow);
  const reasonBySlug = new Map(categories.map((c) => [c.slug, c.reason]));
  const categorySlugs = categories.map((c) => c.slug);

  const family = curlFamily(profileRow.curl_type);
  const hairTypeTags = [profileRow.curl_type, family].filter((t): t is string => Boolean(t));
  const brandByCategory = await fetchBrandProductsForTravel(
    categorySlugs,
    hairTypeTags,
    tripClimate ?? null,
    scoringProfile
  );

  const results: TravelKitProduct[] = [];
  const usedProductIds = new Set<string>();

  for (const [slug, items] of Object.entries(brandByCategory)) {
    const best = items.find((item) => !isChildrenProduct(item.name));
    if (!best) continue;
    results.push(brandItemToTravelKitProduct(best, slug, reasonBySlug.get(slug) ?? ""));
  }

  const remainingSlugs = categorySlugs.filter((slug) => !results.some((r) => r.categorySlug === slug));

  const { data: categoryRows } = await admin.from("categories").select("id, slug").in("slug", remainingSlugs);
  const categoryIdBySlug = new Map((categoryRows ?? []).map((c) => [c.slug as string, c.id as string]));

  for (const slug of remainingSlugs) {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) continue;

    const { data: candidates } = await admin
      .from("catalog_products")
      .select("id, name, catalog_brands(name)")
      .eq("category_id", categoryId)
      .limit(30);

    const pool = (candidates ?? []).filter((c) => !usedProductIds.has(c.id) && !isChildrenProduct(c.name));
    if (pool.length === 0) continue;

    const scores = await scoreCatalogProductsForProfile(pool.map((c) => c.id), scoringProfile);

    const best = pool
      .map((c) => ({ product: c, score: scores[c.id]?.result?.normalizedScore ?? -1 }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0) continue;

    usedProductIds.add(best.product.id);
    const brandName =
      (best.product.catalog_brands as unknown as { name: string } | null)?.name ?? "Unknown brand";

    results.push({
      catalogProductId: best.product.id,
      name: best.product.name,
      brand: brandName,
      categorySlug: slug,
      categoryLabel: CATEGORY_LABEL_BY_SLUG[slug] ?? slug,
      score: best.score,
      reason: reasonBySlug.get(slug) ?? "",
    });
  }

  return results;
}
