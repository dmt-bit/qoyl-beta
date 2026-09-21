import { supabase } from "@/lib/supabase";
import { curlFamily, scoreCatalogProducts, scoreTier } from "@/lib/compatibility";
import { CATEGORY_LABEL_BY_SLUG } from "@/lib/productCategories";
// Type-only import - erased at compile time, so the service-role code
// in lib/brandCatalogProducts.ts never ends up in this client bundle.
import type { BrandCatalogItem } from "@/lib/brandCatalogProducts";
import type { FakeHairMatch } from "@/lib/fakeHairMatcher";
import type { HairAdditionPreference } from "@/lib/hairAdditionPreference";
import { getToolsForProfile } from "@/lib/getToolsForProfile";
import { TOOLS_CATALOG, type HairTool } from "@/lib/toolsData";

export type ScoredHairCareItem = {
  catalogProductId: string;
  name: string;
  brand: string;
  categoryLabel: string;
  score: number;
};

export type StaticShoppingItem = {
  name: string;
  url: string;
  retailer: string;
};

// Richer than StaticShoppingItem - carries the catalog's own "why this
// matters" and price range when the tool was resolved from
// lib/toolsData.ts (see buildTools below). Both are null for a
// translationToolsNeeded-sourced tool with no matching catalog entry -
// still a real Amazon-search link, just without the extra context.
export type StyleShoppingTool = {
  name: string;
  url: string;
  retailer: string;
  whyItMatters: string | null;
  priceRange: string | null;
};

export type FakeHairItem = {
  name: string;
  description: string;
  packsNeeded: string;
  retailer: string;
  url: string;
  priceRange: string;
};

// A hair seller catalog match plus the pre-built click-tracking path the
// bridge route attaches (see app/api/style-match/fake-hair-products).
export type FakeHairCatalogMatch = FakeHairMatch & { click_path: string };

export type StyleShoppingList = {
  // Listed hair seller products that matched this style/hair. When
  // non-empty they replace the generic Amazon fake hair list in the UI.
  fakeHairCatalogMatches: FakeHairCatalogMatch[];
  // "generic_amazon" placement: a plain Amazon search for the style, shown
  // (with a note) only when no catalog match exists.
  fakeHairGenericSearchUrl: string;
  // Qoyl Partner Brand products, shown above everything else in the
  // Hair Care Products section - see fetchBrandProducts below.
  brandProducts: BrandCatalogItem[];
  hairCare: ScoredHairCareItem[];
  // Only populated for a category where neither a brand product nor a
  // real catalog match exists - an honest "we don't have a curated pick
  // here yet" fallback rather than leaving the category silently empty.
  amazonFallback: StaticShoppingItem[];
  fakeHair: FakeHairItem[];
  fakeHairNote: string | null;
  fakeHairTip: string | null;
  showFakeHairSection: boolean;
  // Item 4 - preference-specific messaging shown alongside the fake
  // hair list (null when preference is no_preference/unanswered, since
  // that's the unfiltered default view with nothing extra to explain).
  fakeHairPreferenceNote: string | null;
  fakeHairPreferenceWarning: string | null;
  fakeHairPreferenceTip: string | null;
  fakeHairPricingNote: string | null;
  // Set only when preference === 'natural_hair_only' and the style
  // requires fake hair - showFakeHairSection is false in that case, and
  // this offers natural-hair-achievable alternatives instead.
  naturalHairAlternativeNote: string | null;
  naturalHairAlternativeStyles: string[];
  lengthExtensionOptions: StaticShoppingItem[];
  tools: StyleShoppingTool[];
  accessories: StaticShoppingItem[];
};

// Amazon/Target/Sally Beauty links below are search-result URLs, not
// specific product pages - there's no real product catalog/affiliate
// feed for these static categories (fake hair, tools, generic
// accessories), so a search link is the honest option rather than
// fabricating a specific ASIN/product page that may not exist or may
// go stale. Matches the same "never a dead link" principle ShopButton
// already uses for catalog products with no brand match.
function amazonSearch(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}
function targetSearch(query: string): string {
  return `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`;
}
function sallyBeautySearch(query: string): string {
  return `https://www.sallybeauty.com/search?q=${encodeURIComponent(query)}`;
}

function styleText(styleName: string, styleDescription: string): string {
  return `${styleName} ${styleDescription}`.toLowerCase();
}

function isBraidedStyle(text: string): boolean {
  return /braid|twist|loc|cornrow|knotless/.test(text);
}
function isHeatStyle(text: string): boolean {
  return /blowout|silk press|straighten|flat iron|press/.test(text);
}
function isWashAndGoStyle(text: string): boolean {
  return /wash.?and.?go|twist.?out|braid.?out|curl/.test(text);
}

// Category slugs match lib/productCategories.ts for the main catalog -
// catalog_products has no distinct "edge control" or "braid spray"
// category, so those still map to the closest existing one (styler,
// leave-in) for that lookup. brand_catalog_products is different: its
// brand-facing form (business.qoyl.live, not this repo) offers exactly
// these protective-style categories as dropdown options, so a brand
// product's category column really can be "edge-control"/"braid-spray"/
// etc. verbatim - both slug families are included here so brand
// products get found by fetchBrandProducts regardless of which
// taxonomy they were tagged under.
const BRAND_CATEGORY_LABELS: Record<string, string> = {
  "edge-control": "Edge Control",
  "braid-spray": "Braid Spray",
  "scalp-spray": "Scalp Spray",
  "braiding-hair": "Braiding Hair",
  "loc-spray": "Loc Spray",
  "wig-care": "Wig Care",
  // style_translations.products_needed slugs (lib/styleTranslations.ts)
  // that don't correspond to a real catalog_products category either -
  // only used to make an Amazon-fallback line read nicely.
  "heat-protectant": "Heat Protectant",
  "texturizing-spray": "Texturizing Spray",
  "light-hold-spray": "Light Hold Spray",
  "finishing-serum": "Finishing Serum",
  "salt-spray": "Salt Spray",
  "blow-dry-cream": "Blow Dry Cream",
  "light-hold-gel": "Light Hold Gel",
  "holding-spray": "Holding Spray",
  "anti-humidity-spray": "Anti-Humidity Spray",
  "light-curl-cream": "Light Curl Cream",
  "sealing-oil": "Sealing Oil",
  "clarifying-shampoo": "Clarifying Shampoo",
  "wig-shine-spray": "Wig Shine Spray",
};

function categoryLabel(slug: string): string {
  return CATEGORY_LABEL_BY_SLUG[slug] ?? BRAND_CATEGORY_LABELS[slug] ?? slug;
}

export function pickCategoriesForStyle(
  styleName: string,
  styleDescription: string,
  translationProductsNeeded?: string[]
): string[] {
  const text = styleText(styleName, styleDescription);
  // A style_translations row's products_needed (already specific to
  // this style + the viewer's hair family) goes first, ahead of even
  // the shampoo/conditioner baseline - a Set preserves insertion order,
  // and both fetchBrandProducts and fetchScoredHairCareProducts process
  // categorySlugs in array order, so "first" here really does mean
  // "shown/matched first."
  const categories = new Set<string>([
    ...(translationProductsNeeded ?? []),
    "shampoo",
    "conditioner",
  ]);

  if (isBraidedStyle(text)) {
    categories.add("styler"); // edge control
    categories.add("edge-control");
    categories.add("leave-in"); // braid spray
    categories.add("braid-spray");
    categories.add("oil"); // scalp oil
    if (/loc/.test(text)) categories.add("loc-spray");
  } else if (isWashAndGoStyle(text)) {
    categories.add("gel");
    categories.add("leave-in");
    categories.add("curl-cream");
  } else {
    categories.add("leave-in");
    categories.add("styler");
    if (/silk press|wig/.test(text)) categories.add("wig-care");
  }

  // Raised from 8 to accommodate up to 4 prioritized translation
  // categories on top of the existing style-detected ones without
  // truncating either.
  return Array.from(categories).slice(0, 12);
}

async function fetchScoredHairCareProducts(
  categorySlugs: string[]
): Promise<{ items: ScoredHairCareItem[]; uncoveredSlugs: string[] }> {
  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", categorySlugs);

  const results: ScoredHairCareItem[] = [];
  const uncoveredSlugs: string[] = [];
  const usedProductIds = new Set<string>();

  for (const slug of categorySlugs) {
    const categoryId = categoryRows?.find((c) => c.slug === slug)?.id;
    if (!categoryId) {
      uncoveredSlugs.push(slug);
      continue;
    }

    const { data: candidates } = await supabase
      .from("catalog_products")
      .select("id, name, catalog_brands(name)")
      .eq("category_id", categoryId)
      .limit(15);

    const pool = (candidates ?? []).filter((c) => !usedProductIds.has(c.id));
    if (pool.length === 0) {
      uncoveredSlugs.push(slug);
      continue;
    }

    const scores = await scoreCatalogProducts(pool.map((c) => c.id));

    const best = pool
      .map((c) => ({
        product: c,
        score: scores[c.id]?.result?.normalizedScore ?? -1,
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0) {
      uncoveredSlugs.push(slug);
      continue;
    }

    usedProductIds.add(best.product.id);
    const brandName =
      (best.product.catalog_brands as unknown as { name: string } | null)?.name ??
      "Unknown brand";

    results.push({
      catalogProductId: best.product.id,
      name: best.product.name,
      brand: brandName,
      categoryLabel: categoryLabel(slug),
      score: best.score,
    });
  }

  return { items: results, uncoveredSlugs };
}

// Item 5 - queries brand_catalog_products first, per category, via the
// service-role bridge route (this file runs client-side). Returns only
// categories that actually had at least one active, style-relevant
// brand product; buildStyleShoppingList falls through to the existing
// catalog scoring for everything else.
async function fetchBrandProducts(
  categorySlugs: string[],
  styleName: string,
  userId: string | null,
  matchId: string | null,
  hairAdditionPreference: HairAdditionPreference | null
): Promise<Record<string, BrandCatalogItem[]>> {
  const params = new URLSearchParams({
    categories: categorySlugs.join(","),
    style_name: styleName,
  });
  if (userId) params.set("user_id", userId);
  if (hairAdditionPreference) params.set("hair_addition_preference", hairAdditionPreference);
  if (matchId) params.set("match_id", matchId);

  try {
    const res = await fetch(`/api/style-match/brand-products?${params.toString()}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.productsByCategory ?? {};
  } catch (err) {
    console.error("[styleShoppingList] brand product fetch failed:", err);
    return {};
  }
}

async function fetchFakeHairCatalogMatches(input: {
  styleName: string;
  userId: string | null;
  matchId: string | null;
  preference: HairAdditionPreference | null;
  curlType: string | null;
  hairColor: string | null;
  hairLength: string | null;
}): Promise<FakeHairCatalogMatch[]> {
  const params = new URLSearchParams({ style_name: input.styleName });
  if (input.userId) params.set("user_id", input.userId);
  if (input.matchId) params.set("match_id", input.matchId);
  if (input.preference) params.set("hair_addition_preference", input.preference);
  if (input.curlType) params.set("curl_type", input.curlType);
  if (input.hairColor) params.set("hair_color", input.hairColor);
  if (input.hairLength) params.set("hair_length", input.hairLength);

  try {
    const res = await fetch(`/api/style-match/fake-hair-products?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches ?? [];
  } catch (err) {
    console.error("[styleShoppingList] fake hair catalog fetch failed:", err);
    return [];
  }
}

const FAKE_HAIR_NOTE =
  "Visit your local beauty supply store for the best color selection and to match your hair color in person. Prices and availability vary by location.";
const FAKE_HAIR_TIP =
  "Buy one extra pack as backup — running out mid-install is a common frustration.";

// Item 4 - hair-type-aware fake hair catalog. Every item is tagged with
// which hair type it is; "universal" items (tools, not added hair
// itself - e.g. a wig grip band) show regardless of preference.
// isOriginalDefault marks exactly the items this list showed before the
// hair_addition_preference feature existed, so preference === null or
// "no_preference" reproduces that unchanged behavior exactly rather
// than silently changing what existing users see.
type FakeHairCatalogItem = FakeHairItem & {
  hairType: "human" | "synthetic" | "heat_resistant_synthetic" | "universal";
  isOriginalDefault: boolean;
};

function braidingHairCatalog(): FakeHairCatalogItem[] {
  return [
    {
      name: "X-Pression Braiding Hair",
      description: "The most popular braiding hair — lightweight, minimal tangling, holds well",
      packsNeeded: "5-8 packs for waist length, 3-5 for shoulder length",
      retailer: "Amazon",
      url: amazonSearch("x-pression braiding hair"),
      priceRange: "$3-5 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Freetress Equal Braiding Hair",
      description: "Pre-stretched option — saves time and reduces hand fatigue during installation",
      packsNeeded: "4-6 packs",
      retailer: "Amazon",
      url: amazonSearch("freetress equal braiding hair"),
      priceRange: "$4-7 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Toyokalon Jumbo Braiding Hair",
      description: "Affordable option, very available at beauty supply stores",
      packsNeeded: "5-8 packs",
      retailer: "Amazon",
      url: amazonSearch("toyokalon jumbo braiding hair"),
      priceRange: "$2-4 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Freetress Equal Heat Resistant Braiding Hair",
      description: "Can be lightly heat styled on low settings, unlike standard braiding hair",
      packsNeeded: "5-8 packs",
      retailer: "Amazon",
      url: amazonSearch("freetress equal heat resistant braiding hair"),
      priceRange: "$5-8 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Sensationnel Synthetic Braiding Hair (Heat-Resistant)",
      description: "Holds curl and wave patterns when styled with low heat",
      packsNeeded: "5-8 packs",
      retailer: "Amazon",
      url: amazonSearch("sensationnel synthetic braiding hair heat resistant"),
      priceRange: "$5-9 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Outre Heat-Defying Braiding Hair",
      description: "Designed for heat-styled looks like braid-and-curl ends",
      packsNeeded: "5-8 packs",
      retailer: "Amazon",
      url: amazonSearch("outre heat defying braiding hair"),
      priceRange: "$6-10 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Bohyme Human Hair Braiding Hair",
      description: "Full human hair bulk — washes, colors, and heat styles like your natural hair",
      packsNeeded: "8-12 packs for waist length, 5-8 for shoulder length",
      retailer: "Amazon",
      url: amazonSearch("bohyme human hair braiding hair bulk"),
      priceRange: "$30-60 per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
    {
      name: "Outre Human Hair Braiding Bulk",
      description: "100% human hair bulk sold specifically for braiding installs",
      packsNeeded: "8-12 packs",
      retailer: "Amazon",
      url: amazonSearch("outre human hair braiding bulk"),
      priceRange: "$35-70 per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
    {
      name: "Human Hair Bulk for Braiding",
      description: "Unprocessed or lightly processed human hair bulk, sold by texture match",
      packsNeeded: "8-12 packs",
      retailer: "Amazon",
      url: amazonSearch("human hair bulk for braiding"),
      priceRange: "$40-80+ per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
  ];
}

function locsCatalog(): FakeHairCatalogItem[] {
  return [
    {
      name: "Freetress Water Wave Crochet Hair",
      description: "Most popular for boho and goddess faux locs — soft texture, natural look",
      packsNeeded: "6-10 packs",
      retailer: "Amazon",
      url: amazonSearch("freetress water wave crochet faux locs"),
      priceRange: "$6-10 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Pre-wrapped Faux Locs",
      description: "Quickest installation — locs come pre-wrapped and ready to crochet",
      packsNeeded: "4-6 packs",
      retailer: "Amazon",
      url: amazonSearch("pre wrapped faux locs crochet hair"),
      priceRange: "$10-18 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Marley Hair for Wrapping",
      description: "Used to wrap individual locs for a more textured, natural finish",
      packsNeeded: "3-5 packs",
      retailer: "Amazon",
      url: amazonSearch("marley hair loc wrapping"),
      priceRange: "$5-8 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Pre-Wrapped Faux Locs (Heat-Resistant Synthetic)",
      description: "Same quick install, fiber can be lightly heat sealed at the ends on low heat",
      packsNeeded: "4-6 packs",
      retailer: "Amazon",
      url: amazonSearch("heat resistant pre wrapped faux locs"),
      priceRange: "$12-20 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Toyokalon Heat-Resistant Loc Extensions",
      description: "Heat-resistant fiber for locs that need sealed, singed, or curled ends",
      packsNeeded: "6-10 packs",
      retailer: "Amazon",
      url: amazonSearch("toyokalon heat resistant loc extensions"),
      priceRange: "$4-8 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Human Hair Faux Locs (Pre-Made)",
      description: "Pre-made locs in real human hair — heaviest investment, most natural movement and shine",
      packsNeeded: "As determined by your stylist",
      retailer: "Amazon",
      url: amazonSearch("human hair faux locs pre made"),
      priceRange: "$150-400+ total",
      hairType: "human",
      isOriginalDefault: false,
    },
    {
      name: "Bohyme Human Hair for Loc Extensions",
      description: "Human hair bulk used to wrap or install faux locs by hand",
      packsNeeded: "6-10 packs",
      retailer: "Amazon",
      url: amazonSearch("bohyme human hair loc extensions"),
      priceRange: "$30-60 per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
  ];
}

function passionTwistCatalog(): FakeHairCatalogItem[] {
  return [
    {
      name: "Freetress Water Wave Passion Twist Hair",
      description: "The original for passion twists — the wavy texture is essential",
      packsNeeded: "6-8 packs",
      retailer: "Amazon",
      url: amazonSearch("freetress water wave passion twist"),
      priceRange: "$6-9 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Spring Twist Hair",
      description: "Pre-twisted option for spring twists or passion twist look",
      packsNeeded: "5-7 packs",
      retailer: "Amazon",
      url: amazonSearch("spring twist hair crochet"),
      priceRange: "$7-12 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Marley Hair for Wrapping",
      description: "Used to wrap twist ends for a more textured, natural finish",
      packsNeeded: "2-4 packs",
      retailer: "Amazon",
      url: amazonSearch("marley hair twist wrapping"),
      priceRange: "$5-8 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Freetress Water Wave Passion Twist (Heat-Resistant)",
      description: "Same wavy texture, fiber tolerates light heat sealing on the ends",
      packsNeeded: "6-8 packs",
      retailer: "Amazon",
      url: amazonSearch("freetress water wave passion twist heat resistant"),
      priceRange: "$7-11 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Outre Heat-Defying Water Wave Twist Hair",
      description: "Built for heat-styled passion twist looks",
      packsNeeded: "6-8 packs",
      retailer: "Amazon",
      url: amazonSearch("outre heat defying water wave twist hair"),
      priceRange: "$7-12 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Human Hair Water Wave Bulk for Passion Twists",
      description: "Human hair bulk in a water-wave texture for a fully natural-looking passion twist",
      packsNeeded: "8-12 packs",
      retailer: "Amazon",
      url: amazonSearch("human hair water wave bulk passion twist"),
      priceRange: "$35-70 per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
  ];
}

function crochetCatalog(): FakeHairCatalogItem[] {
  return [
    {
      name: "Crochet Braiding Hair",
      description: "Pre-looped for easy crochet installation",
      packsNeeded: "4-7 packs depending on density",
      retailer: "Amazon",
      url: amazonSearch("crochet braiding hair pre looped"),
      priceRange: "$8-15 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "X-Pression Crochet Braids",
      description: "Same trusted brand as traditional braiding hair, in a pre-looped crochet format",
      packsNeeded: "4-6 packs",
      retailer: "Amazon",
      url: amazonSearch("x-pression crochet braids"),
      priceRange: "$4-7 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Marley Hair for Crochet",
      description: "Coarser, more natural-textured option for crochet braids or twists",
      packsNeeded: "3-5 packs",
      retailer: "Amazon",
      url: amazonSearch("marley hair crochet braids"),
      priceRange: "$5-8 per pack",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Freetress Crochet Hair (Heat-Resistant)",
      description: "Most crochet hair sold today is heat-resistant — check the packaging for the flame/heat icon",
      packsNeeded: "4-7 packs",
      retailer: "Amazon",
      url: amazonSearch("freetress crochet hair heat resistant"),
      priceRange: "$6-10 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Outre Heat-Defying Crochet Braids",
      description: "Pre-looped and rated for light heat styling",
      packsNeeded: "4-6 packs",
      retailer: "Amazon",
      url: amazonSearch("outre heat defying crochet braids"),
      priceRange: "$6-10 per pack",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Human Hair Crochet Braids",
      description: "Pre-looped human hair crochet extensions for a fully natural finish",
      packsNeeded: "6-10 packs",
      retailer: "Amazon",
      url: amazonSearch("human hair crochet braids pre looped"),
      priceRange: "$35-70 per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
  ];
}

function wigCatalog(): FakeHairCatalogItem[] {
  return [
    {
      name: "Lace Front Wig — Human Hair",
      description: "For a silk press look without heat damage to natural hair",
      packsNeeded: "N/A — 1 wig unit",
      retailer: "Amazon",
      url: amazonSearch("lace front wig human hair straight"),
      priceRange: "$80-400+",
      hairType: "human",
      isOriginalDefault: true,
    },
    {
      name: "Lace Front Wig — Synthetic Heat Resistant",
      description: "More affordable option — can be styled with low heat",
      packsNeeded: "N/A — 1 wig unit",
      retailer: "Amazon",
      url: amazonSearch("heat resistant synthetic lace front wig straight"),
      priceRange: "$25-80",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: true,
    },
    {
      name: "Lace Front Wig — Synthetic (Non-Heat-Resistant)",
      description: "The most affordable option — holds its style but cannot be styled with heat tools",
      packsNeeded: "N/A — 1 wig unit",
      retailer: "Amazon",
      url: amazonSearch("synthetic lace front wig straight"),
      priceRange: "$20-60",
      hairType: "synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Wig Grip Band",
      description: "Keeps the wig secure and comfortable all day without adhesive",
      packsNeeded: "N/A — 1 unit",
      retailer: "Amazon",
      url: amazonSearch("wig grip band"),
      priceRange: "$8-15",
      hairType: "universal",
      isOriginalDefault: true,
    },
  ];
}

function genericCatalog(styleName: string): FakeHairCatalogItem[] {
  return [
    {
      name: `${styleName} Hair Extensions`,
      description: "Search your local beauty supply store for the best color match",
      packsNeeded: "Ask your stylist for the right amount",
      retailer: "Amazon",
      url: amazonSearch(`${styleName} hair extension`),
      priceRange: "Varies",
      hairType: "synthetic",
      isOriginalDefault: true,
    },
    {
      name: `${styleName} Human Hair Extensions`,
      description: "Human hair option — can be heat styled, colored, and treated like your natural hair",
      packsNeeded: "Ask your stylist for the right amount",
      retailer: "Amazon",
      url: amazonSearch(`${styleName} human hair extension`),
      priceRange: "$30-80+ per pack",
      hairType: "human",
      isOriginalDefault: false,
    },
    {
      name: `${styleName} Heat-Resistant Synthetic Extensions`,
      description: "Holds its style pattern and tolerates light heat styling on low settings",
      packsNeeded: "Ask your stylist for the right amount",
      retailer: "Amazon",
      url: amazonSearch(`${styleName} heat resistant synthetic extension`),
      priceRange: "Varies",
      hairType: "heat_resistant_synthetic",
      isOriginalDefault: false,
    },
    {
      name: "Rat Tail Comb (for sectioning)",
      description: "Standard tool for clean, even sections before installing added hair",
      packsNeeded: "N/A — 1 unit",
      retailer: "Amazon",
      url: amazonSearch("rat tail comb"),
      priceRange: "$3-6",
      hairType: "universal",
      isOriginalDefault: true,
    },
    {
      name: "Edge Control",
      description: "For laying edges cleanly around any style that adds hair",
      packsNeeded: "N/A — 1 unit",
      retailer: "Amazon",
      url: amazonSearch("edge control gel"),
      priceRange: "$5-12",
      hairType: "universal",
      isOriginalDefault: true,
    },
  ];
}

// Comprehensive, per-style-type fake hair recommendations, filtered by
// hair_addition_preference (item 4). This section is a hard guarantee
// whenever the detected style requires_fake_hair - every style-category
// catalog above has at least one item per hair type, so "What you will
// need" is never empty for a style that needs added hair, regardless of
// preference.
function generateFakeHairList(
  fakeHairType: string | null,
  styleName: string,
  preference: HairAdditionPreference | null
): FakeHairItem[] {
  const name = styleName.toLowerCase();
  const type = (fakeHairType ?? "").toLowerCase();

  let catalog: FakeHairCatalogItem[];
  if (name.includes("braid")) {
    catalog = braidingHairCatalog();
  } else if (name.includes("loc")) {
    catalog = locsCatalog();
  } else if (name.includes("passion twist") || name.includes("passion")) {
    catalog = passionTwistCatalog();
  } else if (type.includes("crochet")) {
    catalog = crochetCatalog();
  } else if (name.includes("silk press") || type.includes("wig")) {
    catalog = wigCatalog();
  } else {
    catalog = genericCatalog(styleName);
  }

  // preference === null means the user hasn't answered this new
  // question yet - defaults to the exact pre-existing behavior rather
  // than silently changing what every existing user sees.
  const effective = preference ?? "no_preference";
  const PREFERENCE_TO_HAIR_TYPE: Record<string, FakeHairCatalogItem["hairType"]> = {
    human_hair_only: "human",
    synthetic_only: "synthetic",
    heat_resistant_synthetic: "heat_resistant_synthetic",
  };

  let filtered: FakeHairCatalogItem[];
  if (effective === "no_preference") {
    filtered = catalog.filter((item) => item.isOriginalDefault);
  } else if (effective === "natural_hair_only") {
    // Handled entirely by the caller (buildStyleShoppingList hides this
    // section and shows natural-hair-only style alternatives instead) -
    // this function is never called with this preference in practice,
    // but falls back to universal-only rather than an empty list.
    filtered = catalog.filter((item) => item.hairType === "universal");
  } else {
    const targetHairType = PREFERENCE_TO_HAIR_TYPE[effective];
    filtered = catalog.filter((item) => item.hairType === targetHairType || item.hairType === "universal");
  }

  return filtered.map((item) => ({
    name: item.name,
    description: item.description,
    packsNeeded: item.packsNeeded,
    retailer: item.retailer,
    url: item.url,
    priceRange: item.priceRange,
  }));
}

// Deep Match's "longer than my current hair, include extension options"
// answer - a different concept from requires_fake_hair (which is about
// the *style itself* needing added hair, e.g. box braids). This is about
// reaching extra length regardless of style, so the options differ:
// clip-ins/tape-ins for a natural-hair-plus-length look, or a full
// weave/wig for styles that are already braided/covered.
function buildLengthExtensionOptions(
  styleName: string,
  styleDescription: string
): StaticShoppingItem[] {
  const text = styleText(styleName, styleDescription);

  if (isBraidedStyle(text)) {
    return [
      { name: "Weave/sew-in extensions", url: amazonSearch("weave hair extensions bundle"), retailer: "Amazon" },
      { name: "Braiding hair (extra length)", url: sallyBeautySearch("braiding hair extensions"), retailer: "Sally Beauty" },
    ];
  }

  return [
    { name: "Clip-in extensions", url: amazonSearch("clip in hair extensions textured"), retailer: "Amazon" },
    { name: "Tape-in extensions", url: sallyBeautySearch("tape in hair extensions"), retailer: "Sally Beauty" },
  ];
}

function catalogToolToShoppingTool(tool: HairTool): StyleShoppingTool {
  return {
    name: tool.name,
    url: amazonSearch(tool.amazon_search),
    retailer: "Amazon",
    whyItMatters: tool.why_it_matters,
    priceRange: tool.price_range,
  };
}
function plainTool(name: string, url: string, retailer: string): StyleShoppingTool {
  return { name, url, retailer, whyItMatters: null, priceRange: null };
}

// A style_translations row's tools_needed is free text authored per
// style+family - matched case-insensitively against lib/toolsData.ts's
// names so it can still carry the catalog's why-it-matters/price when
// there's a real match, falling back to a plain Amazon-search link
// otherwise (still specific to this exact style, just without the
// extra context).
function buildTranslationTools(names: string[]): StyleShoppingTool[] {
  return names.map((name) => {
    const lower = name.toLowerCase();
    const match = TOOLS_CATALOG.find(
      (t) => t.name.toLowerCase() === lower || lower.includes(t.name.toLowerCase())
    );
    return match ? { ...catalogToolToShoppingTool(match), name } : plainTool(name, amazonSearch(name), "Amazon");
  });
}

// Selects from the same shared catalog /routine and the travel kit use
// (lib/toolsData.ts via getToolsForProfile) rather than a hardcoded
// list, so "why this matters" and price come from one place. Layered on
// top of the hair-family filter: a fixed set of style-condition rules
// (heat/braided/wash-and-go/extensions) picks which of the family-
// relevant tools are actually worth packing for this specific style.
// heatRequired, when the viewer has a style_translations row for this
// style+family, overrides the generic keyword guess - it's already
// known precisely for that combination.
function buildTools(
  curlType: string | null,
  styleName: string,
  styleDescription: string,
  heatRequired: boolean | undefined,
  hasExtensions: boolean,
  translationToolsNeeded?: string[]
): StyleShoppingTool[] {
  if (translationToolsNeeded?.length) {
    return buildTranslationTools(translationToolsNeeded);
  }

  const text = styleText(styleName, styleDescription);
  const family = curlFamily(curlType);
  const { essential, recommended } = getToolsForProfile({ curlType, hasExtensions });
  const byId = new Map([...essential, ...recommended].map((t) => [t.id, t]));

  const ids = new Set<string>();
  if (heatRequired ?? isHeatStyle(text)) {
    ids.add("blow-dryer");
    ids.add(family === "curly" || family === "coily" ? "diffuser" : "flat-iron");
  }
  if (isBraidedStyle(text)) {
    ids.add("rat-tail-comb");
    ids.add("applicator-bottle");
    ids.add("satin-bonnet");
  }
  if (isWashAndGoStyle(text)) {
    ids.add("diffuser");
    ids.add("microfiber-towel");
    ids.add("spray-bottle");
  }
  if (hasExtensions) {
    ids.add("wig-stand");
    ids.add("wide-tooth-comb");
    ids.add("satin-bonnet");
  }

  const tools = Array.from(ids)
    .map((id) => byId.get(id))
    .filter((t): t is HairTool => Boolean(t))
    .map(catalogToolToShoppingTool);

  // No style-condition matched (no heat/braid/wash-and-go signal and no
  // extensions) - fall back to the always-useful basics the previous
  // hardcoded list opened with, still sourced from the catalog.
  if (tools.length === 0) {
    ["rat-tail-comb", "wide-tooth-comb", "spray-bottle", "sectioning-clips"].forEach((id) => {
      const tool = byId.get(id);
      if (tool) tools.push(catalogToolToShoppingTool(tool));
    });
  }

  if (isBraidedStyle(text)) {
    tools.push(
      plainTool("Rubber bands", amazonSearch("hair rubber bands"), "Amazon"),
      plainTool("Bead tool", amazonSearch("hair bead tool"), "Amazon")
    );
  }

  return tools;
}

function buildAccessories(accessoriesVisible: string[]): StaticShoppingItem[] {
  const accessories: StaticShoppingItem[] = [];
  const lower = accessoriesVisible.map((a) => a.toLowerCase());

  if (lower.some((a) => a.includes("bead"))) {
    accessories.push({ name: "Hair beads", url: amazonSearch("hair beads for braids"), retailer: "Amazon" });
  }
  if (lower.some((a) => a.includes("ribbon"))) {
    accessories.push({ name: "Ribbon", url: amazonSearch("hair ribbon"), retailer: "Amazon" });
  }
  if (lower.some((a) => a.includes("bobby pin") || a.includes("pin"))) {
    accessories.push({ name: "Bobby pins", url: targetSearch("bobby pins"), retailer: "Target" });
  }
  if (lower.some((a) => a.includes("band") || a.includes("clip") || a.includes("edge"))) {
    accessories.push({ name: "Edge brush", url: amazonSearch("edge control brush"), retailer: "Amazon" });
  }

  return accessories;
}

const PREFERENCE_NOTE: Record<string, string> = {
  human_hair_only:
    "Human hair can be washed, heat styled, and colored just like your natural hair — but requires more care than synthetic.",
  synthetic_only:
    "Synthetic hair holds its style pattern and requires minimal maintenance but CANNOT be heat styled. Do not use flat irons or curling irons on synthetic hair — it will melt.",
  heat_resistant_synthetic:
    "Heat-resistant synthetic can be styled with heat tools on LOW settings only (below 350°F). Always test a small section first.",
};
const PREFERENCE_WARNING: Record<string, string> = {
  synthetic_only: "⚠️ No heat tools",
};
const PREFERENCE_TIP: Record<string, string> = {
  heat_resistant_synthetic:
    "Most crochet hair sold today is heat-resistant — check the packaging for the flame/heat icon.",
};
const HUMAN_HAIR_PRICING_NOTE =
  "Human hair is significantly more expensive than synthetic — budget $30-80+ per pack for quality human hair braiding hair.";

// Item 4's natural_hair_only branch - suggested styles that need no
// added hair, grouped by the same style-category detection used for
// the fake hair catalogs above.
function suggestNaturalHairAlternatives(styleName: string, styleDescription: string): string[] {
  const text = styleText(styleName, styleDescription);
  if (isBraidedStyle(text)) {
    return ["Bantu Knots", "Twist Out", "Two-Strand Twists"];
  }
  return ["Wash and Go", "Twist Out", "Braid Out"];
}

export async function buildStyleShoppingList(input: {
  styleName: string;
  styleDescription: string;
  requiresFakeHair: boolean;
  fakeHairType: string | null;
  accessoriesVisible: string[];
  wantsLengthExtensions?: boolean;
  userId?: string | null;
  matchId?: string | null;
  hairAdditionPreference?: HairAdditionPreference | null;
  // From a style_translations row for this style + the viewer's hair
  // family (see lib/styleTranslations.ts) - prioritizes which product
  // categories are queried first and, when present, replaces the
  // generic Tools section with the family-specific tool list.
  translationProductsNeeded?: string[];
  translationToolsNeeded?: string[];
  // The viewer's own curl type - used only by buildTools (below) to
  // pick the family-appropriate variant of a style-condition tool (a
  // diffuser for curly/coily vs. a flat iron for straight/wavy on a
  // heat style) via the same lib/toolsData.ts catalog /routine and the
  // travel kit use.
  curlType?: string | null;
  // Whether this style calls for added hair - style_translations.
  // heat_required and .fake_hair_required respectively when a
  // translation row exists (strictly more precise than the keyword
  // guesses buildTools falls back to otherwise).
  heatRequired?: boolean;
  // Used only for hair seller catalog matching (color blend + pack count).
  detectedColor?: string | null;
  hairLength?: string | null;
}): Promise<StyleShoppingList> {
  const categorySlugs = pickCategoriesForStyle(
    input.styleName,
    input.styleDescription,
    input.translationProductsNeeded
  );
  const preference = input.hairAdditionPreference ?? null;

  const brandByCategory = await fetchBrandProducts(
    categorySlugs,
    input.styleName,
    input.userId ?? null,
    input.matchId ?? null,
    preference
  );
  const brandProducts = Object.values(brandByCategory).flat();
  const brandCoveredSlugs = new Set(
    Object.entries(brandByCategory)
      .filter(([, items]) => items.length > 0)
      .map(([slug]) => slug)
  );
  const remainingSlugs = categorySlugs.filter((slug) => !brandCoveredSlugs.has(slug));

  const { items: hairCare, uncoveredSlugs } = await fetchScoredHairCareProducts(remainingSlugs);
  const amazonFallback = uncoveredSlugs.map((slug) => {
    const label = categoryLabel(slug);
    return {
      name: `${label} for ${input.styleName}`,
      url: amazonSearch(`${label} ${input.styleName}`),
      retailer: "Amazon",
    };
  });

  // Item 4 - natural_hair_only hides the fake hair section entirely and
  // suggests achievable alternative styles instead; every other
  // preference (including null/unanswered, which behaves like
  // no_preference) shows the normal, hair-type-filtered list. Hard
  // guarantee: whenever shown, every style-category catalog has at
  // least one item per hair type, so this never comes back empty.
  const hideForNaturalHairOnly = input.requiresFakeHair && preference === "natural_hair_only";
  const showFakeHairSection = input.requiresFakeHair && !hideForNaturalHairOnly;
  const fakeHair = showFakeHairSection
    ? generateFakeHairList(input.fakeHairType, input.styleName, preference)
    : [];

  // Listed hair seller products take over the fake hair section when any
  // match; otherwise the existing generic list stays, flagged as generic.
  const fakeHairCatalogMatches = showFakeHairSection
    ? await fetchFakeHairCatalogMatches({
        styleName: input.styleName,
        userId: input.userId ?? null,
        matchId: input.matchId ?? null,
        preference,
        curlType: input.curlType ?? null,
        hairColor: input.detectedColor ?? null,
        hairLength: input.hairLength ?? null,
      })
    : [];

  const lengthExtensionOptions = input.wantsLengthExtensions
    ? buildLengthExtensionOptions(input.styleName, input.styleDescription)
    : [];

  return {
    fakeHairCatalogMatches,
    fakeHairGenericSearchUrl: amazonSearch(`${input.styleName} hair extensions`),
    brandProducts,
    hairCare,
    amazonFallback,
    fakeHair,
    fakeHairNote: showFakeHairSection ? FAKE_HAIR_NOTE : null,
    fakeHairTip: showFakeHairSection ? FAKE_HAIR_TIP : null,
    showFakeHairSection,
    fakeHairPreferenceNote: showFakeHairSection && preference ? PREFERENCE_NOTE[preference] ?? null : null,
    fakeHairPreferenceWarning:
      showFakeHairSection && preference ? PREFERENCE_WARNING[preference] ?? null : null,
    fakeHairPreferenceTip: showFakeHairSection && preference ? PREFERENCE_TIP[preference] ?? null : null,
    fakeHairPricingNote:
      showFakeHairSection && preference === "human_hair_only" ? HUMAN_HAIR_PRICING_NOTE : null,
    naturalHairAlternativeNote: hideForNaturalHairOnly
      ? "This style is typically done with added hair. Here are natural hair alternatives you might consider:"
      : null,
    naturalHairAlternativeStyles: hideForNaturalHairOnly
      ? suggestNaturalHairAlternatives(input.styleName, input.styleDescription)
      : [],
    lengthExtensionOptions,
    tools: buildTools(
      input.curlType ?? null,
      input.styleName,
      input.styleDescription,
      input.heatRequired,
      input.requiresFakeHair,
      input.translationToolsNeeded
    ),
    accessories: buildAccessories(input.accessoriesVisible),
  };
}

export { scoreTier };
