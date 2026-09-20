import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { FUNCTION_DEFAULT_SCORES, ratingForScore } from "@/lib/compatibility";

const POROSITIES: ("low" | "medium" | "high")[] = ["low", "medium", "high"];

type IngredientRow = { id: string; inci_name: string; primary_function: string | null };

// PostgREST caps an unpaginated select() at 1000 rows - compatibility_scores
// alone is already past that. Paging through with .range() is required for
// every full-table read here, not optional: a silent 1000-row truncation on
// fetchScoredIngredientIds previously made already-scored ingredients look
// unscored, which caused runFunctionGeneration to insert duplicate rows for
// ones that already had real curated scores (found and cleaned up once,
// this fixes the root cause so it can't happen again on a future run).
async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const admin = getSupabaseAdmin();
  let all: T[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    all = all.concat((data ?? []) as T[]);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function fetchAllIngredients(): Promise<IngredientRow[]> {
  return fetchAllRows<IngredientRow>("ingredients", "id, inci_name, primary_function");
}

async function fetchScoredIngredientIds(): Promise<Set<string>> {
  const rows = await fetchAllRows<{ ingredient_id: string }>("compatibility_scores", "ingredient_id");
  return new Set(rows.map((r) => r.ingredient_id));
}

export type CoverageBreakdownRow = {
  function: string;
  ingredients: number;
  haveDbScores: number;
  autoScoreable: number;
};

export type CoverageStats = {
  totalIngredients: number;
  haveDbScores: number;
  haveFunctionTags: number;
  completelyUnscored: number;
  breakdown: CoverageBreakdownRow[];
};

export async function getIngredientCoverageStats(): Promise<CoverageStats> {
  const [ingredients, scoredIds] = await Promise.all([
    fetchAllIngredients(),
    fetchScoredIngredientIds(),
  ]);

  const haveDbScores = ingredients.filter((i) => scoredIds.has(i.id)).length;
  const haveFunctionTags = ingredients.filter((i) => i.primary_function !== null).length;
  const completelyUnscored = ingredients.filter(
    (i) => !scoredIds.has(i.id) && i.primary_function === null
  ).length;

  const byFunction = new Map<string, IngredientRow[]>();
  for (const i of ingredients) {
    if (!i.primary_function) continue;
    const list = byFunction.get(i.primary_function) ?? [];
    list.push(i);
    byFunction.set(i.primary_function, list);
  }

  const breakdown: CoverageBreakdownRow[] = Array.from(byFunction.entries())
    .map(([fn, list]) => ({
      function: fn,
      ingredients: list.length,
      haveDbScores: list.filter((i) => scoredIds.has(i.id)).length,
      autoScoreable: FUNCTION_DEFAULT_SCORES[fn]
        ? list.filter((i) => !scoredIds.has(i.id)).length
        : 0,
    }))
    .sort((a, b) => b.ingredients - a.ingredients);

  return {
    totalIngredients: ingredients.length,
    haveDbScores,
    haveFunctionTags,
    completelyUnscored,
    breakdown,
  };
}

function scoreRowsFor(ingredientId: string, primaryFunction: string) {
  const defaults = FUNCTION_DEFAULT_SCORES[primaryFunction];
  if (!defaults) return [];
  return POROSITIES.map((porosity) => ({
    ingredient_id: ingredientId,
    porosity,
    score: defaults[porosity],
    rating: ratingForScore(defaults[porosity]),
    reason: `Auto-generated from function tag: ${primaryFunction}. Review recommended.`,
  }));
}

// Ingredients that have a primary_function recognized by
// FUNCTION_DEFAULT_SCORES but zero compatibility_scores rows at any
// porosity - the exact candidate set for both the preview and the real run.
async function findAutoScoreableIngredients(): Promise<IngredientRow[]> {
  const [ingredients, scoredIds] = await Promise.all([
    fetchAllIngredients(),
    fetchScoredIngredientIds(),
  ]);
  return ingredients.filter(
    (i) => i.primary_function && FUNCTION_DEFAULT_SCORES[i.primary_function] && !scoredIds.has(i.id)
  );
}

export type GenerateScoresPreview = {
  ingredientCount: number;
  rowCount: number;
  sample: {
    inciName: string;
    primaryFunction: string;
    scores: Record<"low" | "medium" | "high", number>;
    ratings: Record<"low" | "medium" | "high", string>;
  }[];
};

export async function previewFunctionGeneration(sampleSize = 10): Promise<GenerateScoresPreview> {
  const candidates = await findAutoScoreableIngredients();
  const sample = candidates.slice(0, sampleSize).map((i) => {
    const defaults = FUNCTION_DEFAULT_SCORES[i.primary_function as string];
    return {
      inciName: i.inci_name,
      primaryFunction: i.primary_function as string,
      scores: defaults,
      ratings: {
        low: ratingForScore(defaults.low),
        medium: ratingForScore(defaults.medium),
        high: ratingForScore(defaults.high),
      },
    };
  });
  return {
    ingredientCount: candidates.length,
    rowCount: candidates.length * POROSITIES.length,
    sample,
  };
}

export async function runFunctionGeneration(): Promise<{
  ingredientsScored: number;
  rowsInserted: number;
}> {
  const candidates = await findAutoScoreableIngredients();
  if (candidates.length === 0) return { ingredientsScored: 0, rowsInserted: 0 };

  const admin = getSupabaseAdmin();
  const rows = candidates.flatMap((i) => scoreRowsFor(i.id, i.primary_function as string));

  const { error } = await admin.from("compatibility_scores").insert(rows);
  if (error) throw new Error(error.message);

  return { ingredientsScored: candidates.length, rowsInserted: rows.length };
}

// Used by the OBF-enrichment accept flow: given ingredient ids that were
// just linked to a product, auto-score any that have a function tag and
// no existing compatibility_scores rows at all (checked directly here
// rather than trusting findAutoScoreableIngredients' full-table scan,
// since this runs per-request against a small, specific id list).
export async function generateScoresForIngredientIds(
  ingredientIds: string[]
): Promise<{ ingredientsScored: number; rowsInserted: number }> {
  if (ingredientIds.length === 0) return { ingredientsScored: 0, rowsInserted: 0 };

  const admin = getSupabaseAdmin();
  const [{ data: ingredients }, { data: existingScores }] = await Promise.all([
    admin.from("ingredients").select("id, inci_name, primary_function").in("id", ingredientIds),
    admin.from("compatibility_scores").select("ingredient_id").in("ingredient_id", ingredientIds),
  ]);

  const alreadyScored = new Set((existingScores ?? []).map((r) => r.ingredient_id));
  const candidates = (ingredients ?? []).filter(
    (i) => i.primary_function && FUNCTION_DEFAULT_SCORES[i.primary_function] && !alreadyScored.has(i.id)
  );
  if (candidates.length === 0) return { ingredientsScored: 0, rowsInserted: 0 };

  const rows = candidates.flatMap((i) => scoreRowsFor(i.id, i.primary_function as string));
  const { error } = await admin.from("compatibility_scores").insert(rows);
  if (error) throw new Error(error.message);

  return { ingredientsScored: candidates.length, rowsInserted: rows.length };
}
