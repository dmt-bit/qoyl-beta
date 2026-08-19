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

export type StyleShoppingList = {
  hairCare: ScoredHairCareItem[];
  fakeHair: StaticShoppingItem[];
  fakeHairNote: string | null;
  showFakeHairSection: boolean;
  tools: StaticShoppingItem[];
  accessories: StaticShoppingItem[];
};

// Amazon/Target/Sally Beauty links below are search-result URLs, not
// specific product pages -- there's no real product catalog/affiliate
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

function buildFakeHairOptions(
  styleName: string,
  styleDescription: string,
  fakeHairType: string | null
): { items: StaticShoppingItem[]; note: string } {
  const text = styleText(styleName, styleDescription);
  const fakeHairText = (fakeHairType ?? "").toLowerCase();
  const note =
    "We recommend purchasing from a beauty supply store to see colors in person.";

  if (fakeHairText.includes("crochet")) {
    return {
      items: [
        { name: "Freetress Water Wave", url: amazonSearch("Freetress Water Wave crochet hair"), retailer: "Amazon" },
      ],
      note,
    };
  }

  if (fakeHairText.includes("wig") || fakeHairText.includes("lace front")) {
    return {
      items: [
        { name: "Lace front wigs", url: amazonSearch("lace front wig"), retailer: "Amazon" },
      ],
      note,
    };
  }

  if (isBraidedStyle(text) || fakeHairText.includes("braid")) {
    return {
      items: [
        { name: "X-Pression Braiding Hair", url: amazonSearch("X-Pression braiding hair"), retailer: "Amazon" },
        { name: "Freetress Braid", url: amazonSearch("Freetress braid hair"), retailer: "Amazon" },
      ],
      note,
    };
  }

  return {
    items: [
      { name: fakeHairType ?? "Fake hair for this style", url: amazonSearch(fakeHairType ?? `${styleName} hair extensions`), retailer: "Amazon" },
    ],
    note,
  };
}

// Deep Match's "longer than my current hair, include extension options"
// answer -- a different concept from requires_fake_hair (which is about
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

  const fakeHairResult = input.requiresFakeHair
    ? buildFakeHairOptions(input.styleName, input.styleDescription, input.fakeHairType)
    : null;

  const lengthExtensionItems = input.wantsLengthExtensions
    ? buildLengthExtensionOptions(input.styleName, input.styleDescription)
    : [];

  return {
    hairCare,
    fakeHair: [...(fakeHairResult?.items ?? []), ...lengthExtensionItems],
    fakeHairNote: fakeHairResult?.note ?? (lengthExtensionItems.length > 0
      ? "We recommend purchasing from a beauty supply store to see colors in person."
      : null),
    showFakeHairSection: input.requiresFakeHair || lengthExtensionItems.length > 0,
    tools: buildTools(input.styleName, input.styleDescription),
    accessories: buildAccessories(input.accessoriesVisible),
  };
}

export { scoreTier };
