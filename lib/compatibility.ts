import { supabase } from "@/lib/supabase";

export type Match = {
  ingredient_name: string;
  score: number;
  rating: "good" | "neutral" | "caution" | "avoid" | string;
};

export type ScoreResult = {
  normalizedScore: number;
  matches: Match[];
};

export function parseIngredients(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.toLowerCase())
    )
  );
}

function normalizeScalpCondition(value: string | null): string | null {
  if (!value) return null;
  return value === "dandruff-prone" ? "dandruff" : value;
}

export function scoreTier(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

export const TIER_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "bg-green text-dark",
  amber: "bg-amber text-dark",
  red: "bg-red text-cream",
};

export const RATING_DOT_CLASSES: Record<string, string> = {
  good: "bg-green",
  neutral: "bg-muted",
  caution: "bg-amber",
  avoid: "bg-red",
};

export async function scoreIngredientsText(
  ingredientsText: string
): Promise<{ error?: string; result?: ScoreResult }> {
  const profileId = localStorage.getItem("hair_profile_id");
  if (!profileId) {
    return {
      error: "No hair profile found. Save a profile on My Profile first.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, strand_thickness")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return { error: "Couldn't load your hair profile." };
  }

  const ingredientNames = parseIngredients(ingredientsText);
  const { data: matches, error: matchError } = await supabase.rpc(
    "match_compatibility_scores",
    {
      p_ingredient_names: ingredientNames,
      p_hair_type: profile.curl_type,
      p_porosity: profile.porosity === "not sure" ? null : profile.porosity,
      p_scalp_condition: normalizeScalpCondition(profile.scalp_condition),
      p_thickness: profile.strand_thickness,
    }
  );

  if (matchError) {
    return { error: matchError.message };
  }

  const matchList: Match[] = matches ?? [];
  const sum = matchList.reduce((acc, m) => acc + m.score, 0);
  const normalizedScore =
    matchList.length === 0
      ? 0
      : Math.round((sum / (matchList.length * 10)) * 100);

  return { result: { normalizedScore, matches: matchList } };
}
