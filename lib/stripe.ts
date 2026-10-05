import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Lazily instantiated so builds/page-data collection succeed even when
// STRIPE_SECRET_KEY isn't set yet - the Stripe SDK throws immediately on
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

// travel_kit is no longer a Stripe product - travel kits are free (see
// app/api/travel-kits/generate/route.ts), so it was removed from here.
export type ProductType = "routine_subscription";

export const STRIPE_PRODUCTS: Record<
  ProductType,
  {
    name: string;
    description?: string;
    mode: "subscription" | "payment";
    unitAmount: number;
    currency: string;
    priceId: string | undefined;
  }
> = {
  routine_subscription: {
    name: "Qoyl Monthly Routine",
    // Passed as subscription_data.description below (shows on the
    // subscription/invoices in Stripe) - NOT the same as what the
    // customer sees on the Checkout page itself. That page's product
    // name/description comes from the Product object attached to
    // STRIPE_ROUTINE_PRICE_ID in the Stripe Dashboard, which this
    // codebase has no code path to change (the session references a
    // fixed pre-created price, not inline price_data). Update that
    // Product's description in the Stripe Dashboard to match this text
    // if you want customers to see it before paying.
    description:
      "Unlimited product searches, Style Match, monthly routine calendar, and personalized product list",
    mode: "subscription",
    unitAmount: 799,
    currency: "usd",
    priceId: process.env.STRIPE_ROUTINE_PRICE_ID,
  },
};
