import type { CurlFamily } from "@/lib/compatibility";

// Config for the Boo Basket Halloween pop-up (pickup Oct 25 2026). Kept
// in one file, imported by the builder, the reserve API route, and the
// admin page, so a price/copy change never needs to happen in more than
// one place.

export const BOO_EVENT = {
  pickupDate: "2026-10-25",
  pickupDateLabel: "Saturday, October 25",
  // Nav link (components/Nav.tsx) hides itself after this instant -
  // the morning after pickup, Central time (Qoyl is Chicago-based).
  navCutoff: "2026-10-26T00:00:00-05:00",
  reservationCents: 1500,
  autoChargeLabel: "charged automatically the morning of pickup (Oct 25)",
};

export type BooLocationId = "logan_square" | "hyde_park";

export const LOCATIONS: { id: BooLocationId; label: string; window: string }[] = [
  { id: "logan_square", label: "Logan Square", window: "11 am – 1:30 pm" },
  { id: "hyde_park", label: "Hyde Park", window: "3 – 5 pm" },
];

export type SwatchColor = { label: string; hex: string };

export const BONNET_COLORS: SwatchColor[] = [
  { label: "Black", hex: "#0a0a0a" },
  { label: "Pink", hex: "#E8A0B4" },
  { label: "Purple", hex: "#6B4E8E" },
  { label: "Ivory", hex: "#F3EDE1" },
  { label: "Forest Green", hex: "#2F4F3C" },
];

export const BEANIE_COLORS: SwatchColor[] = [
  { label: "Black", hex: "#0a0a0a" },
  { label: "Brown", hex: "#5B3A29" },
  { label: "Cream", hex: "#F0E6D2" },
];

export type ToolId = "scalp_massager" | "detangling_comb" | "satin_headband";

export const TOOLS: { val: ToolId; label: string; emoji: string; desc: string }[] = [
  {
    val: "scalp_massager",
    label: "Scalp massager",
    emoji: "🪮",
    desc: "silicone bristles for a 2-minute scalp massage before wash day",
  },
  {
    val: "detangling_comb",
    label: "Detangling comb",
    emoji: "🦷",
    desc: "wide-tooth, for gentle detangling on wet or dry hair",
  },
  {
    val: "satin_headband",
    label: "Satin headband",
    emoji: "🎀",
    desc: "keeps hair off your face without creasing edges",
  },
];

export type SizeId = "boo" | "bigboo";

export const SIZES: Record<
  SizeId,
  {
    label: string;
    totalCents: number;
    remainderCents: number;
    includes: string[];
  }
> = {
  boo: {
    label: "Boo",
    totalCents: 4500,
    remainderCents: 3000,
    includes: [
      "satin bonnet — black or your color",
      "2 minis of your choice",
      "compact mirror + QR sticker",
      "your pick: scalp massager, detangling comb, or satin headband",
      "golden ticket notice + stylist coupon + BOO5 card",
    ],
  },
  bigboo: {
    label: "Big Boo",
    totalCents: 6500,
    remainderCents: 5000,
    includes: [
      "everything in Boo",
      "satin-lined beanie - your color",
      "1 full-size product",
    ],
  },
};

export const EXTRA_MINI_PRICE_CENTS = 600;
export const EXTRA_MINI_MAX = 2;

// Boo-only add-on (Big Boo already includes a beanie) - max 1, can't be
// stacked.
export const BEANIE_ADDON_PRICE_CENTS = 1200;
export const BEANIE_ADDON_MAX = 1;

export const MAX_BASKETS_PER_ORDER = 3;

// ---- Mini/full-size product pool ----------------------------------------
//
// Keyed by CurlFamily (lib/compatibility.ts's curlFamily()), not a
// literal "hair_type" column - hair_profiles has no hair_type-as-texture
// column in current use (curl_type, e.g. "1b", is the real field; the
// legacy "hair_type" column predates curl_type and isn't selected by
// lib/hairProfile.ts). "generic" covers no-profile/not_sure users, whose
// minis aren't re-sorted since there's no family to prefer.
// Placeholder names - swap for real SKUs before launch.
export const MINIS_BY_HAIR_TYPE: Record<CurlFamily | "generic", string[]> = {
  straight: [
    "Weightless Shine Serum",
    "Volumizing Root Lift Spray",
    "Silk Press Heat Protectant",
    "Clarifying Scalp Scrub",
    "Fine Hair Dry Shampoo",
  ],
  wavy: [
    "Wave Enhancing Mousse",
    "Sea Salt Texture Spray",
    "Frizz-Free Curl Refresher",
    "Lightweight Leave-In Mist",
    "Beach Wave Styling Cream",
  ],
  curly: [
    "Curl Defining Custard",
    "Moisture Bomb Leave-In Conditioner",
    "Slip Detangling Conditioner",
    "Curl Refreshing Spray",
    "Anti-Frizz Styling Gel",
  ],
  coily: [
    "Deep Moisture Hair Butter",
    "Edge Control & Hold Gel",
    "Protective Style Refresher Spray",
    "Scalp Soothing Oil Blend",
    "Twist & Define Cream",
  ],
  generic: [
    "Moisture Bomb Leave-In Conditioner",
    "Lightweight Daily Conditioner",
    "All-Hair-Types Styling Cream",
    "Nourishing Hair Oil Blend",
    "Gentle Clarifying Shampoo",
  ],
};

export type GiftHairType = CurlFamily | "not_sure";
export const GIFT_HAIR_TYPE_OPTIONS: { value: GiftHairType; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
  { value: "coily", label: "Coily" },
];

export type GiftPorosity = "normal" | "dry" | "oily" | "not_sure";
export const GIFT_POROSITY_OPTIONS: { value: GiftPorosity; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "dry", label: "Dry" },
  { value: "oily", label: "Oily" },
  { value: "not_sure", label: "Not sure" },
];

export const GIFT_NOTE_MAX_CHARS = 200;
