import { amazonSearch, type StyleShoppingList } from "@/lib/styleShoppingList";
import type { YouTubeVideoSummary } from "@/lib/styleMatchSummary";
import type { InstallType } from "@/lib/installTypes";

// "Complete your look" cart - built from the real, already-working
// style-match systems (lib/styleShoppingList.ts's compat-scored
// hairCare/tools/fakeHairCatalogMatches, lib/fakeHairMatcher.ts's real
// hair-seller matches, the YouTube search route's results) rather than
// a parallel tools-by-install-type map or a from-scratch fake-hair
// matcher. The spec this was built from assumed a generic install_type
// -> tools map; this app already has a far more precise system
// (lib/styleShoppingList.ts's buildTools, keyed off the real style +
// curl family + heat/braid/extension detection), so that's what's used
// instead - see buildToolItems below.
//
// No "qoyl checkout/reservation flow" exists for hair sellers to route
// a qoyl_seller purchase through and keep it on-platform - checked.
// Every fake_hair_products row just carries its own external
// product_url; the only "on qoyl" part of that flow today is a
// click-tracking redirect (app/api/fake-hair-products/click/[id]),
// which this cart reuses for parity. "stays on-platform" isn't
// accurate for qoyl_seller items as this app is actually built - it's
// a tracked external link, same as the amazon lane.

export type SellerType = "qoyl_seller" | "amazon" | "brand_direct" | "youtube";
export type CartItemType = "fake_hair" | "product" | "tool" | "tutorial";
export type CartItemStatus = "pending" | "purchased";

export type CartItem = {
  product_id: string | null;
  product_name: string;
  product_type: CartItemType;
  seller_type: SellerType;
  seller_url: string;
  affiliate_url: string | null;
  price_estimate: number | null;
  compat_score: number | null;
  quantity: number;
  status: CartItemStatus;
  // Item 6 - future-proofing for an internal video vault. null for
  // every tutorial item today; once a real internal_video_id is
  // backfilled, the UI should prefer it over tutorial_url.
  tutorial_url?: string;
  internal_video_id?: string | null;
};

const MAX_PRODUCTS = 5;

// Real hair-seller catalog match (lib/fakeHairMatcher.ts via
// lib/styleShoppingList.ts's fakeHairCatalogMatches, already sorted by
// score - [0] is the highest-scoring match for this texture/color goal)
// when one exists; otherwise the generic Amazon fake-hair list's first
// item. requires_fake_hair is the caller's responsibility to check
// before calling this - buildCartItems below only calls it when true.
function buildFakeHairItem(shoppingList: StyleShoppingList): CartItem | null {
  const catalogMatch = shoppingList.fakeHairCatalogMatches[0];
  if (catalogMatch) {
    return {
      product_id: catalogMatch.id,
      product_name: catalogMatch.product_name,
      product_type: "fake_hair",
      seller_type: "qoyl_seller",
      // click_path (a relative /api/fake-hair-products/click/{id}
      // redirect) rather than the raw product_url directly - this is
      // the same click-tracked path "Shop ->" already uses elsewhere
      // in the shopping list UI, so this cart's qoyl_seller opens stay
      // in that same analytics trail. There's no separate on-platform
      // checkout to route this through (see the module comment above
      // and this PR's write-up) - it's still an external redirect,
      // just a tracked one.
      seller_url: catalogMatch.click_path,
      // qoyl_seller items don't carry a separate affiliate link - the
      // "affiliate_url" field is specific to the amazon seller_type
      // (see buildProductItems below). Left null here rather than
      // duplicating seller_url into a field that means something
      // different for this seller_type.
      affiliate_url: null,
      price_estimate: catalogMatch.price_per_pack_usd,
      compat_score: Math.round(catalogMatch.score),
      quantity: catalogMatch.packs_recommended ?? 1,
      status: "pending",
    };
  }

  const generic = shoppingList.fakeHair[0];
  if (generic) {
    return {
      product_id: null,
      product_name: generic.name,
      product_type: "fake_hair",
      seller_type: "amazon",
      seller_url: generic.url,
      affiliate_url: generic.url,
      price_estimate: null,
      compat_score: null,
      quantity: 1,
      status: "pending",
    };
  }

  return null;
}

// Top products from the real compat-scored hairCare list (already one
// best-scoring product per relevant category, via
// lib/compatibility.ts's scoreCatalogProducts - not a flat top-5
// ignoring category spread). Brand partner products are intentionally
// skipped here - those route to the brand's own site already elsewhere
// in the shopping list UI, and this cart's "amazon" lane specifically
// needs a product name to build a search link from, which
// BrandCatalogItem doesn't guarantee matches what's sold on Amazon.
function buildProductItems(shoppingList: StyleShoppingList, priceByProductId: Map<string, number>): CartItem[] {
  return shoppingList.hairCare
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PRODUCTS)
    .map((item) => {
      const amazonUrl = amazonSearch(`${item.brand} ${item.name}`);
      return {
        product_id: item.catalogProductId,
        product_name: item.name,
        product_type: "product",
        seller_type: "amazon",
        seller_url: amazonUrl,
        affiliate_url: amazonUrl,
        price_estimate: priceByProductId.get(item.catalogProductId) ?? null,
        compat_score: item.score,
        quantity: 1,
        status: "pending",
      } satisfies CartItem;
    });
}

// shoppingList.tools is already install/style-aware (lib/
// styleShoppingList.ts's buildTools - heat/braid/wash-and-go/extension
// detection plus the real curl-family split), so this just maps it to
// cart items rather than re-deriving tools from install_type with a
// separate hardcoded map. buildCartItems below still takes and threads
// installType through its own signature (for a future, more
// install-type-specific filter to plug into without changing every
// call site) - just not into this particular function, which doesn't
// need it.
function buildToolItems(shoppingList: StyleShoppingList): CartItem[] {
  return shoppingList.tools.map((tool) => ({
    product_id: null,
    product_name: tool.name,
    product_type: "tool",
    seller_type: "amazon",
    seller_url: tool.url,
    affiliate_url: tool.url,
    price_estimate: null,
    compat_score: null,
    quantity: 1,
    status: "pending",
  }));
}

function buildTutorialItem(tutorial: YouTubeVideoSummary | null): CartItem | null {
  if (!tutorial) return null;
  const url = `https://www.youtube.com/watch?v=${tutorial.videoId}`;
  return {
    product_id: null,
    product_name: tutorial.title,
    product_type: "tutorial",
    seller_type: "youtube",
    seller_url: url,
    affiliate_url: null,
    price_estimate: null,
    compat_score: null,
    quantity: 1,
    status: "pending",
    tutorial_url: url,
    internal_video_id: null,
  };
}

export function buildCartItems(input: {
  shoppingList: StyleShoppingList;
  tutorial: YouTubeVideoSummary | null;
  installType: InstallType | null;
  requiresFakeHair: boolean;
  priceByProductId?: Map<string, number>;
}): CartItem[] {
  const items: CartItem[] = [];

  if (input.requiresFakeHair) {
    const fakeHair = buildFakeHairItem(input.shoppingList);
    if (fakeHair) items.push(fakeHair);
  }

  items.push(...buildProductItems(input.shoppingList, input.priceByProductId ?? new Map()));
  items.push(...buildToolItems(input.shoppingList));

  const tutorial = buildTutorialItem(input.tutorial);
  if (tutorial) items.push(tutorial);

  return items;
}

export function cartEstimatedTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.price_estimate ?? 0) * item.quantity, 0);
}
