// Maps the existing StyleShoppingList + CartItem types to KitItem -
// a richer shape for the My Look Kit page. Routine step ordering,
// "why this was chosen" text, and retailer grouping all live here.
//
// No new DB table: kit items are assembled on the fly from the
// style_matches row (shopping_list + detected_details) and the
// catalog_products price lookup the style-cart API already does.
// The style_cart row IS created so the QR/share URL (/kit/[cartId])
// is stable and analytics can track it.

import type { StyleShoppingList, ScoredHairCareItem, StyleShoppingTool } from "@/lib/styleShoppingList";
import type { DetectedStyleDetails } from "@/lib/styleMatchSummary";

// Routine order the kit groups items by. Maps from product category
// slug / product_type to a step - same categories as productCategories.ts.
export type KitStep =
  | "prep"
  | "wash"
  | "condition"
  | "treat"
  | "style"
  | "finish"
  | "tools"
  | "hair";

export const KIT_STEP_LABEL: Record<KitStep, string> = {
  prep: "prep",
  wash: "wash",
  condition: "condition",
  treat: "treat",
  style: "style",
  finish: "finish",
  tools: "tools",
  hair: "hair",
};

export const KIT_STEP_ORDER: KitStep[] = [
  "hair",
  "prep",
  "wash",
  "condition",
  "treat",
  "style",
  "finish",
  "tools",
];

// Maps category slugs to routine steps
const SLUG_TO_STEP: Record<string, KitStep> = {
  "pre-shampoo": "prep",
  "scalp-treatment": "prep",
  "treatment": "treat",
  "hair-mask": "treat",
  "deep-conditioner": "treat",
  "shampoo": "wash",
  "dry-shampoo": "wash",
  "co-wash": "wash",
  "conditioner": "condition",
  "leave-in": "condition",
  "detangler": "condition",
  "heat-protectant": "style",
  "styler": "style",
  "gel": "style",
  "curl-cream": "style",
  "mousse": "style",
  "oil": "finish",
  "hairspray": "finish",
  "shine-finishing": "finish",
  "volumizing": "finish",
  "other": "style",
  // protective style specific
  "edge-control": "style",
  "braid-spray": "style",
  "loc-spray": "style",
  "wig-care": "finish",
};

function slugFromCategoryLabel(label: string): string {
  return label.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-");
}

function stepForCategoryLabel(label: string): KitStep {
  const slug = slugFromCategoryLabel(label);
  return SLUG_TO_STEP[slug] ?? "style";
}

export type KitItem = {
  id: string;
  name: string;
  brand: string | null;
  step: KitStep;
  qty: number;
  unitPrice: number | null;
  currency: "USD";
  retailer: string;
  productUrl: string;
  imageUrl: string | null;
  why: string;
  isToggled: boolean; // "i already have this"
  compatScore: number | null;
  productType: "product" | "tool" | "hair" | "accessory";
};

function hairItemFromShoppingList(list: StyleShoppingList, styleName: string): KitItem[] {
  const items: KitItem[] = [];

  // Qoyl seller catalog match (best scored hair seller match)
  const catalogMatch = list.fakeHairCatalogMatches[0];
  if (catalogMatch) {
    items.push({
      id: `hair-catalog-${catalogMatch.id}`,
      name: catalogMatch.product_name,
      brand: catalogMatch.brand_name ?? null,
      step: "hair",
      qty: catalogMatch.packs_recommended ?? 1,
      unitPrice: catalogMatch.price_per_pack_usd ?? null,
      currency: "USD",
      retailer: "qoyl seller",
      productUrl: catalogMatch.click_path,
      imageUrl: null,
      why: catalogMatch.matched_color
        ? `color-matched to ${catalogMatch.matched_color}`
        : `matched for ${styleName}`,
      isToggled: false,
      compatScore: Math.round(catalogMatch.score),
      productType: "hair",
    });
    return items;
  }

  // Generic fake hair items
  for (const fh of list.fakeHair.slice(0, 2)) {
    items.push({
      id: `hair-generic-${encodeURIComponent(fh.name)}`,
      name: fh.name,
      brand: null,
      step: "hair",
      qty: 1,
      unitPrice: null,
      currency: "USD",
      retailer: fh.retailer,
      productUrl: fh.url,
      imageUrl: null,
      why: fh.description,
      isToggled: false,
      compatScore: null,
      productType: "hair",
    });
  }

  return items;
}

function productItems(
  hairCare: ScoredHairCareItem[],
  priceById: Map<string, number>
): KitItem[] {
  return hairCare.map((item) => ({
    id: `product-${item.catalogProductId}`,
    name: item.name,
    brand: item.brand,
    step: stepForCategoryLabel(item.categoryLabel),
    qty: 1,
    unitPrice: priceById.get(item.catalogProductId) ?? null,
    currency: "USD",
    retailer: "amazon",
    productUrl: `https://www.amazon.com/s?k=${encodeURIComponent(`${item.brand} ${item.name}`)}&tag=${process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "qoyl-20"}`,
    imageUrl: null,
    why: item.matchReason,
    isToggled: false,
    compatScore: item.score,
    productType: "product",
  }));
}

function toolItems(tools: StyleShoppingTool[]): KitItem[] {
  return tools.map((tool) => ({
    id: `tool-${encodeURIComponent(tool.name)}`,
    name: tool.name,
    brand: null,
    step: "tools",
    qty: 1,
    unitPrice: null,
    currency: "USD",
    retailer: tool.retailer,
    productUrl: tool.url,
    imageUrl: null,
    why: tool.whyItMatters ?? "essential for this look",
    isToggled: false,
    compatScore: null,
    productType: "tool",
  }));
}

export function buildKitItems(input: {
  shoppingList: StyleShoppingList;
  detectedDetails: DetectedStyleDetails;
  styleName: string;
  priceById: Map<string, number>;
}): KitItem[] {
  const { shoppingList, detectedDetails, styleName, priceById } = input;
  const items: KitItem[] = [];

  if (detectedDetails.requires_fake_hair) {
    items.push(...hairItemFromShoppingList(shoppingList, styleName));
  }

  items.push(...productItems(shoppingList.hairCare, priceById));
  items.push(...toolItems(shoppingList.tools));

  return items;
}
