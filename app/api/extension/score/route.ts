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
  // catalog_products has no brand_name column — brand is via brand_id -> catalog_brands
  let productRow: { id: string; name: string; brand_name: string | null } | null = null;

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
  // We try several stripped variants so catalog names still match.
  const searchCandidates: string[] = [];

  function normalizeHyphens(n: string) {
    // "blow-dry" and "blow dry" should both match catalog entries
    return n.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  }

  // 1. Full name cleaned (with and without hyphens)
  const cleaned = cleanName(normalizedName);
  searchCandidates.push(cleaned);
  const cleanedNoHyphens = normalizeHyphens(cleaned);
  if (cleanedNoHyphens !== cleaned) searchCandidates.push(cleanedNoHyphens);

  // 2. Brand stripped from front
  if (brandName) {
    const stripped = normalizedName
      .replace(new RegExp(`^${brandName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
      .trim();
    if (stripped && stripped !== normalizedName) {
      searchCandidates.push(cleanName(stripped));
      searchCandidates.push(normalizeHyphens(cleanName(stripped)));
    }
  }

  // 3. Try suffixes — lowered threshold to >= 2 words to catch short names
  const words = cleanName(normalizedName).split(" ").filter(Boolean);
  if (words.length >= 2) {
    if (words.length > 3) searchCandidates.push(words.slice(-4).join(" "));
    if (words.length > 2) searchCandidates.push(words.slice(-3).join(" "));
    searchCandidates.push(words.slice(-2).join(" "));
  }

  // Run searches in priority order, stop at first hit
  // catalog_products joins to catalog_brands for the brand name
  for (const candidate of searchCandidates) {
    if (!candidate || candidate.length < 3) continue;

    const { data: rows } = await admin
      .from("catalog_products")
      .select("id, name, catalog_brands(name)")
      .ilike("name", `%${candidate.slice(0, 60)}%`)
      .limit(5);

    if (rows?.length) {
      // Pick closest match by name length similarity to the original
      const best = rows.reduce((b: typeof rows[0], row) => {
        const diff = Math.abs(row.name.length - productName.length);
        const bestDiff = Math.abs(b.name.length - productName.length);
        return diff < bestDiff ? row : b;
      });
      productRow = {
        id: best.id,
        name: best.name,
        brand_name: (best.catalog_brands as unknown as { name: string } | null)?.name ?? null,
      };
      break;
    }

    // If we have a brand, also try brand-scoped search via the join
    if (brandName) {
      // First find the brand id, then search products by brand_id + name
      const { data: brandData } = await admin
        .from("catalog_brands")
        .select("id")
        .ilike("name", `%${brandName.slice(0, 40)}%`)
        .limit(1)
        .maybeSingle();

      if (brandData?.id) {
        const { data: brandRows } = await admin
          .from("catalog_products")
          .select("id, name, catalog_brands(name)")
          .eq("brand_id", brandData.id)
          .ilike("name", `%${candidate.slice(0, 40)}%`)
          .limit(3);
        if (brandRows?.length) {
          const br = brandRows[0];
          productRow = {
            id: br.id,
            name: br.name,
            brand_name: (br.catalog_brands as unknown as { name: string } | null)?.name ?? brandName,
          };
          break;
        }
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
      brandName: productRow.brand_name ?? null,
      curlType: hairProfile?.curl_type ?? null,
      notInCatalog: false,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
