import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Lazily instantiated so builds/page-data collection succeed even when
// STRIPE_SECRET_KEY isn't set yet -- the Stripe SDK throws immediately on
// construction if the key is empty, and that must not happen at module
// load time (e.g. import-time evaluation during `next build`).
export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export type ProductType = "routine_subscription" | "travel_kit";

export const STRIPE_PRODUCTS: Record<
  ProductType,
  {
    name: string;
    mode: "subscription" | "payment";
    unitAmount: number;
    currency: string;
    priceId: string | undefined;
  }
> = {
  routine_subscription: {
    name: "Qoyl Monthly Routine",
    mode: "subscription",
    unitAmount: 799,
    currency: "usd",
    priceId: process.env.STRIPE_ROUTINE_PRICE_ID,
  },
  travel_kit: {
    name: "Qoyl Travel Kit",
    mode: "payment",
    unitAmount: 499,
    currency: "usd",
    priceId: process.env.STRIPE_TRAVEL_PRICE_ID,
  },
};
