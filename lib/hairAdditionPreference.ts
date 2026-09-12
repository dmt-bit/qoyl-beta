// Human vs synthetic hair preference - affects the Style Match shopping
// list's fake hair recommendations (lib/styleShoppingList.ts), brand
// catalog product filtering (lib/brandCatalogProducts.ts), and the
// stylist "human hair installs only" filter.
export type HairAdditionPreference =
  | "human_hair_only"
  | "synthetic_only"
  | "heat_resistant_synthetic"
  | "no_preference"
  | "natural_hair_only";

// Same set minus natural_hair_only - the Deep Match survey only asks
// this once the user has already said the style involves added hair
// (item 3), so "natural hair only" isn't a coherent answer there.
export type DeepMatchHairAdditionPreference = Exclude<
  HairAdditionPreference,
  "natural_hair_only"
>;

export const HAIR_ADDITION_PREFERENCE_OPTIONS: {
  value: HairAdditionPreference;
  label: string;
  description: string;
}[] = [
  {
    value: "human_hair_only",
    label: "Human Hair",
    description:
      "Can be heat styled, colored, and treated like natural hair. Higher cost but most versatile and natural-looking.",
  },
  {
    value: "synthetic_only",
    label: "Synthetic Hair",
    description:
      "Holds its style pattern, more affordable, cannot be heat styled (unless heat-resistant). Great for defined styles.",
  },
  {
    value: "heat_resistant_synthetic",
    label: "Heat-Resistant Synthetic",
    description:
      "The best of both - can be lightly heat styled while being more affordable than human hair. Most crochet and many braiding hairs are heat-resistant synthetic.",
  },
  {
    value: "no_preference",
    label: "No preference",
    description: "Show me the best option for each style regardless of hair type.",
  },
  {
    value: "natural_hair_only",
    label: "My natural hair only",
    description: "I do not use added hair - show me styles I can achieve with my natural hair.",
  },
];

export const DEEP_MATCH_HAIR_ADDITION_OPTIONS = HAIR_ADDITION_PREFERENCE_OPTIONS.filter(
  (o): o is { value: DeepMatchHairAdditionPreference; label: string; description: string } =>
    o.value !== "natural_hair_only"
);

export const HAIR_ADDITION_PREFERENCE_LABELS: Record<HairAdditionPreference, string> =
  Object.fromEntries(HAIR_ADDITION_PREFERENCE_OPTIONS.map((o) => [o.value, o.label])) as Record<
    HairAdditionPreference,
    string
  >;

// extension_profiles already captures this at a finer grain via
// extension_texture (synthetic / human_straight / human_wavy /
// human_curly / blended / heat_resistant_synthetic) - rather than a
// second, overlapping column, this normalizes that existing field into
// the same 5-way preference for any consumer that needs one value.
// "blended" (human + synthetic mixed) has no clean 1:1 target; it's
// treated as no_preference since the wearer is already using both.
export function normalizeExtensionTexture(
  extensionTexture: string | null
): HairAdditionPreference | null {
  if (!extensionTexture) return null;
  if (extensionTexture.startsWith("human_")) return "human_hair_only";
  if (extensionTexture === "synthetic") return "synthetic_only";
  if (extensionTexture === "heat_resistant_synthetic") return "heat_resistant_synthetic";
  if (extensionTexture === "blended") return "no_preference";
  return null;
}

// Item 6 - WHERE clause for brand_catalog_products.hair_type_category.
// A product with no hair_type_category set (true for every row today -
// that field only starts getting populated once qoyl-business's brand
// form asks for it) always passes through unfiltered, same as every
// other "missing data doesn't block display" pattern in this app.
export function matchesHairTypeCategory(
  preference: HairAdditionPreference | null,
  hairTypeCategory: string | null
): boolean {
  if (!hairTypeCategory) return true;
  if (!preference || preference === "no_preference" || preference === "natural_hair_only") {
    return true;
  }
  if (hairTypeCategory === "care_product") return true;
  if (preference === "human_hair_only") return hairTypeCategory === "human_hair";
  if (preference === "synthetic_only") return hairTypeCategory === "synthetic";
  if (preference === "heat_resistant_synthetic") {
    return hairTypeCategory === "heat_resistant_synthetic";
  }
  return true;
}
