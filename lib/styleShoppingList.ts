import { supabase } from "@/lib/supabase";
import { scoreCatalogProducts, scoreTier } from "@/lib/compatibility";
import { CATEGORY_LABEL_BY_SLUG } from "@/lib/productCategories";

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

export type FakeHairItem = {
  name: string;
  description: string;
  packsNeeded: string;
  retailer: string;
  url: string;
  priceRange: string;
};

export type StyleShoppingList = {
  hairCare: ScoredHairCareItem[];
  fakeHair: FakeHairItem[];
  fakeHairNote: string | null;
  fakeHairTip: string | null;
  showFakeHairSection: boolean;
  lengthExtensionOptions: StaticShoppingItem[];
  tools: StaticShoppingItem[];
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

// Category slugs match lib/productCategories.ts. There's no distinct
// "edge control" or "braid spray" category in the catalog, so those map
// to the closest existing category (styler, leave-in).
export function pickCategoriesForStyle(
  styleName: string,
  styleDescription: string
): string[] {
  const text = styleText(styleName, styleDescription);
  const categories = new Set<string>(["shampoo", "conditioner"]);

  if (isBraidedStyle(text)) {
    categories.add("styler"); // edge control
    categories.add("leave-in"); // braid spray
    categories.add("oil"); // scalp oil
  } else if (isWashAndGoStyle(text)) {
    categories.add("gel");
    categories.add("leave-in");
    categories.add("curl-cream");
  } else {
    categories.add("leave-in");
    categories.add("styler");
  }

  return Array.from(categories).slice(0, 5);
}

async function fetchScoredHairCareProducts(
  categorySlugs: string[]
): Promise<ScoredHairCareItem[]> {
  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", categorySlugs);

  const results: ScoredHairCareItem[] = [];
  const usedProductIds = new Set<string>();

  for (const slug of categorySlugs) {
    const categoryId = categoryRows?.find((c) => c.slug === slug)?.id;
    if (!categoryId) continue;

    const { data: candidates } = await supabase
      .from("catalog_products")
      .select("id, name, catalog_brands(name)")
      .eq("category_id", categoryId)
      .limit(15);

    const pool = (candidates ?? []).filter((c) => !usedProductIds.has(c.id));
    if (pool.length === 0) continue;

    const scores = await scoreCatalogProducts(pool.map((c) => c.id));

    const best = pool
      .map((c) => ({
        product: c,
        score: scores[c.id]?.result?.normalizedScore ?? -1,
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0) continue;

    usedProductIds.add(best.product.id);
    const brandName =
      (best.product.catalog_brands as unknown as { name: string } | null)?.name ??
      "Unknown brand";

    results.push({
      catalogProductId: best.product.id,
      name: best.product.name,
      brand: brandName,
      categoryLabel: CATEGORY_LABEL_BY_SLUG[slug] ?? slug,
      score: best.score,
    });
  }

  return results;
}

const FAKE_HAIR_NOTE =
  "Visit your local beauty supply store for the best color selection and to match your hair color in person. Prices and availability vary by location.";
const FAKE_HAIR_TIP =
  "Buy one extra pack as backup — running out mid-install is a common frustration.";

// Comprehensive, per-style-type fake hair recommendations. This section
// is a hard guarantee whenever the detected style requires_fake_hair -
// every branch below returns at least 3 items, including the generic
// fallback, so "What you will need" is never empty for a style that
// needs added hair.
function generateFakeHairList(
  fakeHairType: string | null,
  styleName: string
): FakeHairItem[] {
  const name = styleName.toLowerCase();
  const type = (fakeHairType ?? "").toLowerCase();

  // Box braids, knotless braids, goddess braids
  if (name.includes("braid")) {
    return [
      {
        name: "X-Pression Braiding Hair",
        description: "The most popular braiding hair — lightweight, minimal tangling, holds well",
        packsNeeded: "5-8 packs for waist length, 3-5 for shoulder length",
        retailer: "Amazon",
        url: amazonSearch("x-pression braiding hair"),
        priceRange: "$3-5 per pack",
      },
      {
        name: "Freetress Equal Braiding Hair",
        description: "Pre-stretched option — saves time and reduces hand fatigue during installation",
        packsNeeded: "4-6 packs",
        retailer: "Amazon",
        url: amazonSearch("freetress equal braiding hair"),
        priceRange: "$4-7 per pack",
      },
      {
        name: "Toyokalon Jumbo Braiding Hair",
        description: "Affordable option, very available at beauty supply stores",
        packsNeeded: "5-8 packs",
        retailer: "Amazon",
        url: amazonSearch("toyokalon jumbo braiding hair"),
        priceRange: "$2-4 per pack",
      },
    ];
  }

  // Faux locs, goddess locs
  if (name.includes("loc")) {
    return [
      {
        name: "Freetress Water Wave Crochet Hair",
        description: "Most popular for boho and goddess faux locs — soft texture, natural look",
        packsNeeded: "6-10 packs",
        retailer: "Amazon",
        url: amazonSearch("freetress water wave crochet faux locs"),
        priceRange: "$6-10 per pack",
      },
      {
        name: "Pre-wrapped Faux Locs",
        description: "Quickest installation — locs come pre-wrapped and ready to crochet",
        packsNeeded: "4-6 packs",
        retailer: "Amazon",
        url: amazonSearch("pre wrapped faux locs crochet hair"),
        priceRange: "$10-18 per pack",
      },
      {
        name: "Marley Hair for Wrapping",
        description: "Used to wrap individual locs for a more textured, natural finish",
        packsNeeded: "3-5 packs",
        retailer: "Amazon",
        url: amazonSearch("marley hair loc wrapping"),
        priceRange: "$5-8 per pack",
      },
    ];
  }

  // Passion twists
  if (name.includes("passion twist") || name.includes("passion")) {
    return [
      {
        name: "Freetress Water Wave Passion Twist Hair",
        description: "The original for passion twists — the wavy texture is essential",
        packsNeeded: "6-8 packs",
        retailer: "Amazon",
        url: amazonSearch("freetress water wave passion twist"),
        priceRange: "$6-9 per pack",
      },
      {
        name: "Spring Twist Hair",
        description: "Pre-twisted option for spring twists or passion twist look",
        packsNeeded: "5-7 packs",
        retailer: "Amazon",
        url: amazonSearch("spring twist hair crochet"),
        priceRange: "$7-12 per pack",
      },
      {
        name: "Marley Hair for Wrapping",
        description: "Used to wrap twist ends for a more textured, natural finish",
        packsNeeded: "2-4 packs",
        retailer: "Amazon",
        url: amazonSearch("marley hair twist wrapping"),
        priceRange: "$5-8 per pack",
      },
    ];
  }

  // Crochet styles
  if (type.includes("crochet")) {
    return [
      {
        name: "Crochet Braiding Hair",
        description: "Pre-looped for easy crochet installation",
        packsNeeded: "4-7 packs depending on density",
        retailer: "Amazon",
        url: amazonSearch("crochet braiding hair pre looped"),
        priceRange: "$8-15 per pack",
      },
      {
        name: "X-Pression Crochet Braids",
        description: "Same trusted brand as traditional braiding hair, in a pre-looped crochet format",
        packsNeeded: "4-6 packs",
        retailer: "Amazon",
        url: amazonSearch("x-pression crochet braids"),
        priceRange: "$4-7 per pack",
      },
      {
        name: "Marley Hair for Crochet",
        description: "Coarser, more natural-textured option for crochet braids or twists",
        packsNeeded: "3-5 packs",
        retailer: "Amazon",
        url: amazonSearch("marley hair crochet braids"),
        priceRange: "$5-8 per pack",
      },
    ];
  }

  // Wig styles (silk press, straight styles)
  if (name.includes("silk press") || type.includes("wig")) {
    return [
      {
        name: "Lace Front Wig — Human Hair",
        description: "For a silk press look without heat damage to natural hair",
        packsNeeded: "N/A — 1 wig unit",
        retailer: "Amazon",
        url: amazonSearch("lace front wig human hair straight"),
        priceRange: "$80-400+",
      },
      {
        name: "Lace Front Wig — Synthetic Heat Resistant",
        description: "More affordable option — can be styled with low heat",
        packsNeeded: "N/A — 1 wig unit",
        retailer: "Amazon",
        url: amazonSearch("heat resistant synthetic lace front wig straight"),
        priceRange: "$25-80",
      },
      {
        name: "Wig Grip Band",
        description: "Keeps the wig secure and comfortable all day without adhesive",
        packsNeeded: "N/A — 1 unit",
        retailer: "Amazon",
        url: amazonSearch("wig grip band"),
        priceRange: "$8-15",
      },
    ];
  }

  // Generic fallback — should rarely be hit
  return [
    {
      name: `${styleName} Hair Extensions`,
      description: "Search your local beauty supply store for the best color match",
      packsNeeded: "Ask your stylist for the right amount",
      retailer: "Amazon",
      url: amazonSearch(`${styleName} hair extension`),
      priceRange: "Varies",
    },
    {
      name: "Rat Tail Comb (for sectioning)",
      description: "Standard tool for clean, even sections before installing added hair",
      packsNeeded: "N/A — 1 unit",
      retailer: "Amazon",
      url: amazonSearch("rat tail comb"),
      priceRange: "$3-6",
    },
    {
      name: "Edge Control",
      description: "For laying edges cleanly around any style that adds hair",
      packsNeeded: "N/A — 1 unit",
      retailer: "Amazon",
      url: amazonSearch("edge control gel"),
      priceRange: "$5-12",
    },
  ];
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

function buildTools(styleName: string, styleDescription: string): StaticShoppingItem[] {
  const text = styleText(styleName, styleDescription);
  const tools: StaticShoppingItem[] = [
    { name: "Rat tail comb", url: amazonSearch("rat tail comb"), retailer: "Amazon" },
    { name: "Wide tooth comb", url: amazonSearch("wide tooth comb"), retailer: "Amazon" },
    { name: "Spray bottle", url: amazonSearch("hair spray bottle"), retailer: "Amazon" },
    { name: "Sectioning clips", url: amazonSearch("hair sectioning clips"), retailer: "Amazon" },
  ];

  if (isHeatStyle(text)) {
    tools.push(
      { name: "Hooded dryer", url: sallyBeautySearch("hooded dryer"), retailer: "Sally Beauty" },
      { name: "Heated cap", url: amazonSearch("heated conditioning cap"), retailer: "Amazon" }
    );
  }

  if (isBraidedStyle(text)) {
    tools.push(
      { name: "Rubber bands", url: amazonSearch("hair rubber bands"), retailer: "Amazon" },
      { name: "Bead tool", url: amazonSearch("hair bead tool"), retailer: "Amazon" }
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

export async function buildStyleShoppingList(input: {
  styleName: string;
  styleDescription: string;
  requiresFakeHair: boolean;
  fakeHairType: string | null;
  accessoriesVisible: string[];
  wantsLengthExtensions?: boolean;
}): Promise<StyleShoppingList> {
  const categorySlugs = pickCategoriesForStyle(input.styleName, input.styleDescription);
  const hairCare = await fetchScoredHairCareProducts(categorySlugs);

  // Hard guarantee: whenever the style requires fake hair, this section
  // is always populated (generateFakeHairList always returns >= 3 items,
  // including its generic fallback branch) - it can never come back
  // empty or missing the way an earlier, purely conditional version
  // sometimes did.
  const fakeHair = input.requiresFakeHair
    ? generateFakeHairList(input.fakeHairType, input.styleName)
    : [];

  const lengthExtensionOptions = input.wantsLengthExtensions
    ? buildLengthExtensionOptions(input.styleName, input.styleDescription)
    : [];

  return {
    hairCare,
    fakeHair,
    fakeHairNote: input.requiresFakeHair ? FAKE_HAIR_NOTE : null,
    fakeHairTip: input.requiresFakeHair ? FAKE_HAIR_TIP : null,
    showFakeHairSection: input.requiresFakeHair,
    lengthExtensionOptions,
    tools: buildTools(input.styleName, input.styleDescription),
    accessories: buildAccessories(input.accessoriesVisible),
  };
}

export { scoreTier };
