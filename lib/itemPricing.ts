// Shared price-estimation logic used by both the checkout page (client-side
// display) and the checkout API (server-side Stripe line items). Keeping it
// in one place means the displayed total always matches what Stripe charges.

import type { CartItem } from "@/lib/styleCart";

// Category-based fallback prices (USD) for items with no catalog price_usd.
// Conservative mid-market estimates — used only as a last resort.
export function keywordPriceFallback(item: CartItem): number | null {
  if (item.product_type === "tutorial") return null;
  const n = item.product_name.toLowerCase();
  if (item.product_type === "tool") {
    if (n.includes("dryer") || n.includes("flat iron") || n.includes("curling")) return 39.99;
    if (n.includes("diffuser")) return 24.99;
    if (n.includes("brush") || n.includes("comb") || n.includes("detangl")) return 14.99;
    if (n.includes("bonnet") || n.includes("cap") || n.includes("wrap")) return 12.99;
    return 19.99;
  }
  // Hair / fake_hair products
  if (n.includes("shampoo") || n.includes("conditioner") || n.includes("co-wash")) return 16.99;
  if (n.includes("mask") || n.includes("treatment") || n.includes("deep")) return 18.99;
  if (n.includes("oil") || n.includes("serum")) return 14.99;
  if (n.includes("leave-in") || n.includes("leave in")) return 15.99;
  if (n.includes("gel") || n.includes("mousse") || n.includes("cream")) return 13.99;
  if (n.includes("spray") || n.includes("mist")) return 12.99;
  return 15.99;
}

// Resolve the best price for a single item given an optional catalog price map.
// Returns null only for tutorials.
export function resolvePrice(
  item: CartItem,
  priceById: Map<string, number>
): number | null {
  if (item.price_estimate != null && item.price_estimate > 0) return item.price_estimate;
  if (item.product_id && priceById.has(item.product_id)) return priceById.get(item.product_id)!;
  return keywordPriceFallback(item);
}
