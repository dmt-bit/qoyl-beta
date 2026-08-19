// Shared by PostFilterGrid.tsx (client component) and app/posts/page.tsx
// (server component) -- kept in a plain module with no "use client"
// directive, since a client component's exports (even plain functions/
// constants) become opaque client references when imported into server
// code, which broke isTabKey() being called server-side in app/posts/page.tsx.
export type TabKey =
  | "all"
  | "ingredients"
  | "straight"
  | "wavy"
  | "curly"
  | "coily"
  | "extensions"
  | "mens"
  | "baby"
  | "community";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "straight", label: "Straight" },
  { key: "wavy", label: "Wavy" },
  { key: "curly", label: "Curly" },
  { key: "coily", label: "Coily" },
  { key: "extensions", label: "Extensions & Wigs" },
  { key: "mens", label: "Men's Hair" },
  { key: "baby", label: "Baby & Kids" },
  { key: "community", label: "Community" },
];

const TAB_KEYS = new Set<string>(TABS.map((tab) => tab.key));

export function isTabKey(value: string | undefined): value is TabKey {
  return Boolean(value && TAB_KEYS.has(value));
}
