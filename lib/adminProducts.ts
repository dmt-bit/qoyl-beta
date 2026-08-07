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

// Matches each normalized ingredient name against the ingredients +
// aliases tables (same tiered matcher used by the live scoring flow in
// lib/compatibility.ts). Returns the rows to insert into
// catalog_product_ingredients plus the list of names that matched
// nothing, for the admin UI to flag as needing a new ingredients row.
export async function matchIngredientNames(
  names: string[]
): Promise<{
  matchedRows: { ingredient_id: string; position: number }[];
  unmatched: string[];
}> {
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
  const unmatched: string[] = [];

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
      unmatched.push(name);
    }
  });

  const matchedRows = Array.from(positionById.entries()).map(
    ([ingredient_id, position]) => ({ ingredient_id, position })
  );

  return { matchedRows, unmatched };
}
