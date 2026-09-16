import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type VisualLibraryImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  hair_types: string[];
  categories: string[];
  mood: string | null;
  card_types: string[];
  is_active: boolean;
  used_count: number;
  created_at: string;
};

const ALL_STYLES_SENTINEL = "all";

type FallbackParams = {
  hair_types?: string[];
  category?: string;
  mood?: string;
  exclude_ids?: string[];
};

// Server-only - visual_library is read/written exclusively through the
// service role (this function and the admin API routes), so it never
// needs its own RLS policy, matching every other shared/internal table
// this app reads via getSupabaseAdmin().
//
// Each tier below builds a FRESH query from scratch rather than
// layering more filters onto one shared builder - supabase-js's filter
// methods mutate and return the same PostgrestFilterBuilder instance,
// so reusing one across tiers would silently carry tier 1's filters
// into tier 2 and beyond.
export async function getFallbackImage(params: FallbackParams): Promise<string | null> {
  const admin = getSupabaseAdmin();

  function baseQuery() {
    let q = admin.from("visual_library").select("id, image_url, used_count").eq("is_active", true);
    if (params.exclude_ids?.length) {
      q = q.not("id", "in", `(${params.exclude_ids.join(",")})`);
    }
    return q;
  }

  async function pickAndIncrement(
    rows: { id: string; image_url: string; used_count: number }[] | null
  ): Promise<string | null> {
    if (!rows || rows.length === 0) return null;
    const pick = rows[Math.floor(Math.random() * rows.length)];
    await admin
      .from("visual_library")
      .update({ used_count: pick.used_count + 1 })
      .eq("id", pick.id);
    return pick.image_url;
  }

  // First try: match both hair type AND category.
  if (params.hair_types?.length && params.category) {
    const { data: exact } = await baseQuery()
      .overlaps("hair_types", params.hair_types)
      .contains("categories", [params.category])
      .order("used_count", { ascending: true })
      .limit(5);
    const picked = await pickAndIncrement(exact);
    if (picked) return picked;
  }

  // Second try: match hair type only, or an image tagged for all types.
  if (params.hair_types?.length) {
    const { data: byHair } = await baseQuery()
      .or(`hair_types.ov.{${params.hair_types.join(",")}},hair_types.cs.{${ALL_STYLES_SENTINEL}}`)
      .order("used_count", { ascending: true })
      .limit(5);
    const picked = await pickAndIncrement(byHair);
    if (picked) return picked;
  }

  // Final fallback: any active image, least used first.
  const { data: any } = await baseQuery().order("used_count", { ascending: true }).limit(5);
  return pickAndIncrement(any);
}
