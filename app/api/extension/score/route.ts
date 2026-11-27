import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildScoringProfile, scoreCatalogProductsForProfile, scoreTier } from "@/lib/compatibility";

// POST /api/extension/score
// Called by the Qoyl Chrome extension on product pages.
// Looks up the product in the catalog and returns a personalized score
// if the user is authenticated, or a generic score if not.
//
// Body: { productName: string, brandName?: string }
// Auth: Bearer token in Authorization header (optional — scores still
//       returned without auth, just not personalized to curl type)
//
// Returns:
//   { score, tier, productName, curlType, notInCatalog }

// CORS: the extension sends requests from chrome-extension:// origin.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const productName: string = typeof body.productName === "string" ? body.productName.trim() : "";
  const brandName: string | null = typeof body.brandName === "string" ? body.brandName.trim() : null;

  if (!productName) {
    return NextResponse.json(
      { error: "productName is required." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const admin = getSupabaseAdmin();

  // --- Resolve user hair profile from Bearer token (optional) ---------------
  let hairProfile: {
    curl_type: string | null;
    porosity: string | null;
    scalp_condition: string | null;
    climate: string | null;
    water_hardness: string | null;
  } | null = null;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      // Validate token and get user
      const { data: { user }, error } = await admin.auth.getUser(token);
      if (!error && user) {
        const { data: profile } = await admin
          .from("hair_profiles")
          .select("curl_type, porosity, scalp_condition, climate, water_hardness")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile) hairProfile = profile;
      }
    } catch {
      // Non-fatal — fall through to generic scoring
    }
  }

  // --- Look up product in catalog -------------------------------------------
  // Try exact match first, then fuzzy via ilike
  let productRow: { id: string; name: string; brand_name: string | null; category: string | null } | null = null;

  const normalizedName = productName.toLowerCase();

  // Build a name query — strip common noise words for better matching
  const searchName = normalizedName
    .replace(/\b(the|a|an|and|with|for|of|by)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const { data: exactRows } = await admin
    .from("catalog_products")
    .select("id, name, brand_name, category")
    .ilike("name", `%${searchName.slice(0, 60)}%`)
    .limit(5);

  if (exactRows?.length) {
    // Pick the closest match by name length similarity
    productRow = exactRows.reduce((best, row) => {
      const diff = Math.abs(row.name.length - productName.length);
      const bestDiff = Math.abs(best.name.length - productName.length);
      return diff < bestDiff ? row : best;
    });
  }

  // Also try brand + partial name if we have a brand
  if (!productRow && brandName) {
    const { data: brandRows } = await admin
      .from("catalog_products")
      .select("id, name, brand_name, category")
      .ilike("brand_name", `%${brandName.slice(0, 40)}%`)
      .ilike("name", `%${searchName.slice(0, 40)}%`)
      .limit(3);
    if (brandRows?.length) productRow = brandRows[0];
  }

  if (!productRow) {
    return NextResponse.json(
      { notInCatalog: true, productName },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // --- Score the product for the user's profile (or a default) -------------
  const profile = hairProfile
    ? buildScoringProfile(
        {
          curl_type: hairProfile.curl_type,
          porosity: hairProfile.porosity,
          scalp_condition: hairProfile.scalp_condition,
          climate: hairProfile.climate,
          water_hardness: hairProfile.water_hardness,
        },
        hairProfile.climate
      )
    : buildScoringProfile(
        { curl_type: null, porosity: "medium", scalp_condition: "normal", climate: "temperate", water_hardness: null },
        "temperate"
      );

  const results = await scoreCatalogProductsForProfile([productRow.id], profile);
  const entry = results[productRow.id];
  const result = entry?.result;

  if (!result) {
    return NextResponse.json(
      { notInCatalog: true, productName },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const score = Math.round(result.normalizedScore);
  const tier = scoreTier(score);

  return NextResponse.json(
    {
      score,
      tier,
      productName: productRow.name,
      brandName: productRow.brand_name,
      curlType: hairProfile?.curl_type ?? null,
      notInCatalog: false,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
