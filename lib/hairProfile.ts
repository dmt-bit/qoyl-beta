import { supabase } from "@/lib/supabase";

export type HairProfile = {
  id: string;
  curl_type: string | null;
  porosity: string | null;
  scalp_condition: string | null;
  strand_thickness: string | null;
  zip_code: string | null;
  climate: string | null;
  water_hardness: string | null;
  hair_concerns: string[] | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  shower_filter: string | null;
  // Really a Postgres boolean column - see isColorTreatedYes in
  // lib/compatibility.ts. Typed as the union here rather than a plain
  // boolean since some callers (e.g. app/profile/page.tsx's form state)
  // still work with the "yes"/"no" string convention.
  color_treated: string | boolean | null;
  color_type: string | null;
  extensions: string | null;
  extension_type: string[] | null;
  extension_care: string | null;
  budget_range: string | null;
  routine_focus: string | null;
  notes: string | null;
  updated_at: string | null;
  profile_for: string | null;
  age_range: string | null;
  adult_age_range: string | null;
  gender: string | null;
  hair_goals: string[] | null;
  daily_search_count: number | null;
  daily_search_reset_at: string | null;
  style_match_count: number | null;
  hair_addition_preference: string | null;
  // Set at most once, from the first photo a user uploads to Style Match -
  // see app/api/style-match/create/route.ts.
  face_shape: string | null;
};

const HAIR_PROFILE_COLUMNS =
  "id, curl_type, porosity, scalp_condition, strand_thickness, zip_code, climate, water_hardness, hair_concerns, first_name, last_name, email, shower_filter, color_treated, color_type, extensions, extension_type, extension_care, budget_range, routine_focus, notes, updated_at, profile_for, age_range, adult_age_range, gender, hair_goals, daily_search_count, daily_search_reset_at, style_match_count, hair_addition_preference, face_shape";

export async function fetchHairProfileByUserId(
  userId: string
): Promise<HairProfile | null> {
  const { data } = await supabase
    .from("hair_profiles")
    .select(HAIR_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}
