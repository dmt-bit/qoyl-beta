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
  let productRow: { id: string; name: string; brand_name: string | null; category: string | null } | null = null;

  const normalizedName = productName.toLowerCase().trim();

  // Strip common noise words
  function cleanName(n: string) {
    return n
      .replace(/\b(the|a|an|and|with|for|of|by)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Build a list of search candidates — the page title often includes the
  // brand name as a prefix (e.g. "Camille Rose Curl Love Moisture Milk").
  // We try several stripped variants so catalog names like "Curl Love
  // Moisture Milk" still match.
  const searchCandidates: string[] = [];

  // 1. Full name cleaned
  searchCandidates.push(cleanName(normalizedName));

  // 2. Brand stripped from front — if brandName is provided or if the
  //    product name starts with a likely brand prefix (first 1-3 words).
  if (brandName) {
    const stripped = normalizedName
      .replace(new RegExp(`^${brandName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
      .trim();
    if (stripped && stripped !== normalizedName) {
      searchCandidates.push(cleanName(stripped));
    }
  }

  // 3. Try the last 3–6 words of the name (the actual product name usually
  //    sits at the end when brand + product are concatenated).
  const words = cleanName(normalizedName).split(" ").filter(Boolean);
  if (words.length > 3) {
    searchCandidates.push(words.slice(-4).join(" "));
    searchCandidates.push(words.slice(-3).join(" "));
  }

  // Run searches in priority order, stop at first hit
  for (const candidate of searchCandidates) {
    if (!candidate || candidate.length < 3) continue;

    const { data: rows } = await admin
      .from("catalog_products")
      .select("id, name, brand_name, category")
      .ilike("name", `%${candidate.slice(0, 60)}%`)
      .limit(5);

    if (rows?.length) {
      // Pick closest match by name length similarity to the original
      productRow = rows.reduce((best, row) => {
        const diff = Math.abs(row.name.length - productName.length);
        const bestDiff = Math.abs(best.name.length - productName.length);
        return diff < bestDiff ? row : best;
      });
      break;
    }

    // If we have a brand, also try brand-scoped search with this candidate
    if (brandName) {
      const { data: brandRows } = await admin
        .from("catalog_products")
        .select("id, name, brand_name, category")
        .ilike("brand_name", `%${brandName.slice(0, 40)}%`)
        .ilike("name", `%${candidate.slice(0, 40)}%`)
        .limit(3);
      if (brandRows?.length) {
        productRow = brandRows[0];
        break;
      }
    }
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
