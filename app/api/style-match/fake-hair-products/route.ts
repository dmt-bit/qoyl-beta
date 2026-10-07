import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { matchFakeHairProducts } from "@/lib/fakeHairMatcher";
import type { HairAdditionPreference } from "@/lib/hairAdditionPreference";

const VALID_PREFERENCES = new Set<HairAdditionPreference>([
  "human_hair_only",
  "synthetic_only",
  "heat_resistant_synthetic",
  "no_preference",
  "natural_hair_only",
]);

// Server bridge for the client-side shopping list (same pattern as
// /api/style-match/brand-products). Also logs one shopping_list_placement
// impression per surfaced product.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const styleName = searchParams.get("style_name");
  if (!styleName) return NextResponse.json({ matches: [] });

  const pref = searchParams.get("hair_addition_preference");
  const hairPreference =
    pref && VALID_PREFERENCES.has(pref as HairAdditionPreference) ? (pref as HairAdditionPreference) : null;
  const userId = searchParams.get("user_id");
  const matchId = searchParams.get("match_id");
  let curlType = searchParams.get("curl_type");
  let hairColor = searchParams.get("hair_color");

  const admin = getSupabaseAdmin();
  if (userId && (!curlType || !hairColor)) {
    const { data: profile } = await admin
      .from("hair_profiles")
      .select("curl_type, natural_hair_color, color_type")
      .eq("user_id", userId)
      .maybeSingle();
    curlType = curlType ?? profile?.curl_type ?? null;
    // natural_hair_color (e.g. "dark brown", set from a Style Match photo -
    // see app/api/style-match/create/route.ts) is an actual color word, the
    // shape hairColorFamily() below expects. color_type is a color
    // *treatment* type (permanent/highlights/henna/...), never a color
    // word, so it was never a usable match input here - kept as the last
    // resort only in case it was ever hand-entered as a color by mistake.
    hairColor = hairColor ?? profile?.natural_hair_color ?? profile?.color_type ?? null;
  }

  const matches = await matchFakeHairProducts({
    styleName,
    hairPreference,
    curlType,
    hairColor,
    hairLength: searchParams.get("hair_length"),
  });

  if (matchId && matches.length > 0) {
    const { error } = await admin.from("style_match_product_impressions").insert(
      matches.map((m) => ({
        style_match_id: matchId,
        appeared_in: "shopping_list",
        impression_type: "shopping_list_placement",
        fake_hair_product_id: m.id,
        hair_seller_id: m.brand_account_id,
        was_featured: m.is_featured,
        color_matched: m.color_matched,
        matched_color: m.matched_color,
        curl_type: curlType,
        hair_preference: hairPreference,
      }))
    );
    if (error) console.error("[fake-hair-products] impression insert failed:", error);
  }

  // Click context is baked into each path so the client just renders a link.
  const withClickPath = matches.map((m) => {
    const q = new URLSearchParams();
    if (matchId) q.set("style_match_id", matchId);
    q.set("color_matched", String(m.color_matched));
    if (m.matched_color) q.set("matched_color", m.matched_color);
    if (curlType) q.set("curl_type", curlType);
    if (hairPreference) q.set("hair_preference", hairPreference);
    return { ...m, click_path: `/api/fake-hair-products/click/${m.id}?${q.toString()}` };
  });

  return NextResponse.json({ matches: withClickPath });
}
