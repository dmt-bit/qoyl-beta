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

// Matches the slug convention already used by the seeded catalog_brands
// rows (e.g. "Carol's Daughter" -> "carols-daughter", apostrophe dropped
// rather than hyphenated) and, unlike a naive character-class strip,
// transliterates accents instead of losing the character entirely
// (e.g. "TRESemmé" -> "tresemme", not "tresemm").
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/'/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Resolves the "Other (type your own)" brand flow on the admin product
// form: if a free-typed brand name was submitted, look it up
// case-insensitively and reuse it if it already exists, otherwise create
// it -- so the same brand typed twice (e.g. by two different admins)
// never produces two rows. Falls back to the plain selected brand_id
// when no new name was submitted.
export async function resolveBrandId(
  brandId: string | null,
  newBrandName: string | null
): Promise<{ brandId: string | null; error?: string }> {
  const trimmed = newBrandName?.trim();
  if (!trimmed) {
    return { brandId: brandId || null };
  }

  const admin = getSupabaseAdmin();

  const { data: existing, error: findError } = await admin
    .from("catalog_brands")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();

  if (findError) return { brandId: null, error: findError.message };
  if (existing) return { brandId: existing.id };

  const { data: created, error: insertError } = await admin
    .from("catalog_brands")
    .insert({ name: trimmed, slug: slugify(trimmed) })
    .select("id")
    .single();

  if (insertError) return { brandId: null, error: insertError.message };
  return { brandId: created.id };
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
