// Display order/labels for the category browse pills on /search and the
// home page. Slugs match the existing `categories` table exactly (see
// supabase/seed_categories.sql) -- this is just the curated subset/order
// shown to users, not a copy of the schema. "butter" exists in the table
// but isn't part of this list, matching what was asked for.

export type ProductCategory = {
  label: string;
  slug: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { label: "Shampoo", slug: "shampoo" },
  { label: "Conditioner", slug: "conditioner" },
  { label: "Deep Conditioner", slug: "deep-conditioner" },
  { label: "Leave-In", slug: "leave-in" },
  { label: "Styler", slug: "styler" },
  { label: "Gel", slug: "gel" },
  { label: "Oil", slug: "oil" },
  { label: "Curl Cream", slug: "curl-cream" },
  { label: "Mousse", slug: "mousse" },
  { label: "Scalp Treatment", slug: "scalp-treatment" },
  { label: "Treatment", slug: "treatment" },
  { label: "Other", slug: "other" },
];

export const CATEGORY_LABEL_BY_SLUG: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map((c) => [c.slug, c.label])
);
