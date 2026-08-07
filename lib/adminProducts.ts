import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { findBestIngredientMatch, IngredientRow } from "@/lib/compatibility";

// Splits a raw ingredient list on commas and normalizes each entry's
// capitalization to Title Case, while leaving likely acronyms (BTMS,
// BTMS-50, DL-Panthenol's "DL") alone -- title-casing those would turn
// them into unrecognizable strings.
function normalizeIngredientName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  return trimmed
    .split(" ")
    .map((word) => {
      const isLikelyAcronym = word.length > 1 && word === word.toUpperCase();
      if (isLikelyAcronym) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function parseIngredientListRaw(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => normalizeIngredientName(s))
    .filter(Boolean);
}

export type MatchIngredientNamesResult = {
  // Number of entries on the label (positions), not deduped -- what "Y"
  // means in the "X of Y ingredients matched" summary.
  totalCount: number;
  // Entries that resolved to an existing ingredients/aliases row.
  matchedCount: number;
  // Distinct names that matched nothing and got a brand-new ingredients
  // row created for them.
  createdCount: number;
  createdNames: string[];
  // Every row to insert into catalog_product_ingredients -- both the
  // genuinely-matched ones and the newly-created ones, so nothing on the
  // label is left unlinked.
  linkRows: { ingredient_id: string; position: number }[];
};

// Matches each normalized ingredient name against the ingredients +
// aliases tables (same tiered matcher used by the live scoring flow in
// lib/compatibility.ts). Anything that matches nothing gets a new,
// minimal ingredients row (inci_name only, no chemistry data) created and
// linked automatically -- flagged back to the caller as "created" rather
// than left unlinked, since /admin/products' product library relies on
// compatibility_scores presence (not link presence) to signal real
// curation quality: a freshly auto-created ingredient has no
// compatibility_scores row yet, so it naturally shows up as unscored on
// the match-rate column until someone enriches it.
export async function matchIngredientNames(
  names: string[]
): Promise<MatchIngredientNamesResult> {
  const admin = getSupabaseAdmin();

  const [{ data: allIngredients }, { data: aliasRows }] = await Promise.all([
    admin.from("ingredients").select("id, inci_name, common_name"),
    admin.from("aliases").select("alias, ingredient_id"),
  ]);

  const aliasMap = new Map<string, string>();
  for (const row of aliasRows ?? []) {
    aliasMap.set(row.alias.trim().toLowerCase(), row.ingredient_id);
  }

  const positionById = new Map<string, number>();
  // Deduped by lowercased name -- a label that repeats an ingredient
  // string should only create one new ingredients row for it.
  const unmatchedByKey = new Map<string, { name: string; position: number }>();

  names.forEach((name, index) => {
    const match = findBestIngredientMatch(
      name,
      (allIngredients ?? []) as IngredientRow[],
      aliasMap
    );
    if (match) {
      if (!positionById.has(match.id)) {
        positionById.set(match.id, index + 1);
      }
    } else {
      const key = name.toLowerCase();
      if (!unmatchedByKey.has(key)) {
        unmatchedByKey.set(key, { name, position: index + 1 });
      }
    }
  });

  const matchedCount = positionById.size;
  const createdNames: string[] = [];

  for (const { name, position } of Array.from(unmatchedByKey.values())) {
    const { data: newIngredient, error } = await admin
      .from("ingredients")
      .insert({ inci_name: name, common_name: null })
      .select("id")
      .single();
    if (error || !newIngredient) continue;
    positionById.set(newIngredient.id, position);
    createdNames.push(name);
  }

  const linkRows = Array.from(positionById.entries()).map(
    ([ingredient_id, position]) => ({ ingredient_id, position })
  );

  return {
    totalCount: names.length,
    matchedCount,
    createdCount: createdNames.length,
    createdNames,
    linkRows,
  };
}
