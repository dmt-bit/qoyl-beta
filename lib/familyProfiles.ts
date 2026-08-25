import { supabase } from "@/lib/supabase";

// Separate from hair_profiles (see supabase/create_family_profiles.sql) -
// a parent can save profiles for multiple children under one account, so
// these aren't just another `profile_for` value on the single-row-per-user
// hair_profiles table.

export type BabyProfile = {
  id: string;
  user_id: string;
  name: string | null;
  age_range: string | null;
  hair_texture: string | null;
  hair_density: string | null;
  scalp_condition: string | null;
  allergies_notes: string | null;
  wash_frequency_preference: string | null;
  sensory_sensitive: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ChildProfile = {
  id: string;
  user_id: string;
  name: string | null;
  age_range: string | null;
  curl_type: string | null;
  hair_density: string | null;
  scalp_condition: string | null;
  hair_concerns: string[] | null;
  wash_frequency: string | null;
  cooperative_level: string | null;
  sensory_sensitive: boolean;
  uses_protective_styles: boolean;
  protective_styles_use_extensions: boolean | null;
  heat_tools_used: boolean;
  zip_code: string | null;
  climate: string | null;
  water_hardness: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const BABY_PROFILE_COLUMNS =
  "id, user_id, name, age_range, hair_texture, hair_density, scalp_condition, allergies_notes, wash_frequency_preference, sensory_sensitive, notes, created_at, updated_at";

const CHILD_PROFILE_COLUMNS =
  "id, user_id, name, age_range, curl_type, hair_density, scalp_condition, hair_concerns, wash_frequency, cooperative_level, sensory_sensitive, uses_protective_styles, protective_styles_use_extensions, heat_tools_used, zip_code, climate, water_hardness, notes, created_at, updated_at";

export async function fetchBabyProfilesByUserId(userId: string): Promise<BabyProfile[]> {
  const { data } = await supabase
    .from("baby_profiles")
    .select(BABY_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function fetchChildProfilesByUserId(userId: string): Promise<ChildProfile[]> {
  const { data } = await supabase
    .from("child_profiles")
    .select(CHILD_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function fetchBabyProfileById(id: string): Promise<BabyProfile | null> {
  const { data } = await supabase
    .from("baby_profiles")
    .select(BABY_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export async function fetchChildProfileById(id: string): Promise<ChildProfile | null> {
  const { data } = await supabase
    .from("child_profiles")
    .select(CHILD_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export const BABY_AGE_RANGE_LABELS: Record<string, string> = {
  "0-3_months": "0-3 months",
  "3-6_months": "3-6 months",
  "6-12_months": "6-12 months",
  "12-18_months": "12-18 months",
  "18-24_months": "18-24 months",
};

export const CHILD_AGE_RANGE_LABELS: Record<string, string> = {
  "2-4": "2-4 years",
  "5-7": "5-7 years",
  "8-10": "8-10 years",
  "11-12": "11-12 years",
  "13+": "13+ years",
};

export const BABY_TEXTURE_LABELS: Record<string, string> = {
  fine_straight: "Fine and straight",
  fine_wavy: "Fine and wavy",
  fine_curly: "Fine and curly",
  fine_coily: "Fine and coily",
  coarse_straight: "Coarse and straight",
  coarse_wavy: "Coarse and wavy",
  coarse_curly: "Coarse and curly",
  coarse_coily: "Coarse and coily",
  not_sure: "Not sure yet",
};
