// Display order/labels for the category browse pills on /search and the
// home page. Slugs match the existing `categories` table exactly (see
// supabase/seed_categories.sql) - this is just the curated subset/order
// shown to users, not a copy of the schema. "butter" exists in the table
// but isn't part of this list, matching what was asked for.

export type ProductCategory = {
  label: string;
  slug: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { label: "Pre-Shampoo", slug: "pre-shampoo" },
  { label: "Shampoo", slug: "shampoo" },
  { label: "Dry Shampoo", slug: "dry-shampoo" },
  { label: "Hairspray", slug: "hairspray" },
  { label: "Co-Wash", slug: "co-wash" },
  { label: "Conditioner", slug: "conditioner" },
  { label: "Deep Conditioner", slug: "deep-conditioner" },
  { label: "Hair Mask", slug: "hair-mask" },
  { label: "Leave-In", slug: "leave-in" },
  { label: "Detangler", slug: "detangler" },
  { label: "Heat Protectant", slug: "heat-protectant" },
  { label: "Styler", slug: "styler" },
  { label: "Gel", slug: "gel" },
  // Renamed from "Oil" (diagnostic audit, 2026-10-07) - the category holds
  // both heavy butter-forward oils and lightweight shine serums; the old
  // single-word label read as one undifferentiated bucket. See the filter
  // note shown alongside it on /search for straight/wavy profiles.
  { label: "Oils & Serums", slug: "oil" },
  { label: "Curl Cream", slug: "curl-cream" },
  { label: "Mousse", slug: "mousse" },
  { label: "Scalp Treatment", slug: "scalp-treatment" },
  { label: "Treatment", slug: "treatment" },
  { label: "Other", slug: "other" },
  // New categories (diagnostic audit, 2026-10-07) - see
  // supabase/straight_hair_scoring_fixes.sql. Straight/wavy hair's two
  // most common, previously unfilterable needs.
  { label: "Volumizing", slug: "volumizing" },
  { label: "Shine & Finishing", slug: "shine-finishing" },
];

export const CATEGORY_LABEL_BY_SLUG: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.slug, c.label])
);
