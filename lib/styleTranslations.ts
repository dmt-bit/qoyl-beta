import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { curlFamily } from "@/lib/compatibility";

export type HairFamily = "straight" | "wavy" | "curly" | "coily" | "extensions";

export type StyleTranslation = {
  id: string;
  style_slug: string;
  hair_family: HairFamily;
  translation_headline: string;
  how_to_achieve: string;
  key_difference: string;
  products_needed: string[] | null;
  tools_needed: string[] | null;
  youtube_search_override: string | null;
  difficulty_for_family: string | null;
  time_estimate: string | null;
  heat_required: boolean;
  fake_hair_required: boolean;
};

// Matches lib/brandCatalogProducts.ts's slugifyStyleName - duplicated
// rather than imported since that file pulls in getSupabaseAdmin at
// module scope, which would be harmless here (this file is server-only
// too) but there's no shared neutral home for a five-line pure
// function, so it's not worth adding a cross-file dependency for.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Resolves which of the 5 style_translations families applies. The
// usual 4 come from curlFamily(); overridden to 'extensions' when the
// user has an active extension_profile with real extension types
// selected. An empty extension_types array means "protective style
// only, no added hair" (see lib/extensionProfiles.ts's
// fromDbExtensionTypes) - that doesn't count as the extensions family
// here, since the style translation for "extensions" is specifically
// about styling added hair, not natural hair in a protective style.
export async function resolveHairFamilyForTranslation(
  userId: string | null,
  curlType: string | null
): Promise<HairFamily> {
  if (userId) {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("extension_profiles")
      .select("extension_types")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && (data.extension_types ?? []).length > 0) {
      return "extensions";
    }
  }
  return curlFamily(curlType) ?? "curly";
}

// styleName is the AI-detected free-text style name (e.g. "Beach
// Waves") - slugified and matched exactly against style_slug. Most
// detected styles won't have a seeded translation yet (only
// beach-waves/wash-and-go/silk-press do at launch); this returns null
// rather than a fabricated fallback in that case, same as every other
// "graceful miss" in this app's style-match flow.
export async function getStyleTranslation(
  styleName: string,
  hairFamily: HairFamily
): Promise<StyleTranslation | null> {
  const slug = slugify(styleName);
  const { data } = await getSupabaseAdmin()
    .from("style_translations")
    .select("*")
    .eq("style_slug", slug)
    .eq("hair_family", hairFamily)
    .maybeSingle();
  return (data as StyleTranslation | null) ?? null;
}
