import { supabase } from "@/lib/supabase";

export type HairProfile = {
  id: string;
  curl_type: string | null;
  porosity: string | null;
  scalp_condition: string | null;
  strand_thickness: string | null;
  zip_code: string | null;
  hair_concerns: string[] | null;
};

export async function fetchHairProfileByUserId(
  userId: string
): Promise<HairProfile | null> {
  const { data } = await supabase
    .from("hair_profiles")
    .select(
      "id, curl_type, porosity, scalp_condition, strand_thickness, zip_code, hair_concerns"
    )
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}
