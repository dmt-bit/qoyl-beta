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
  color_treated: string | null;
  color_type: string | null;
  extensions: string | null;
  extension_type: string[] | null;
  extension_care: string | null;
  budget: string | null;
  notes: string | null;
  updated_at: string | null;
  profile_for: string | null;
  age_range: string | null;
  gender: string | null;
  hair_goals: string[] | null;
  daily_search_count: number | null;
  daily_search_reset_at: string | null;
  style_match_count: number | null;
};

const HAIR_PROFILE_COLUMNS =
  "id, curl_type, porosity, scalp_condition, strand_thickness, zip_code, climate, water_hardness, hair_concerns, first_name, last_name, email, shower_filter, color_treated, color_type, extensions, extension_type, extension_care, budget, notes, updated_at, profile_for, age_range, gender, hair_goals, daily_search_count, daily_search_reset_at, style_match_count";

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
