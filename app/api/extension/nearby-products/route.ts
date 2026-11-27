import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildScoringProfile, scoreCatalogProductsForProfile, scoreTier } from "@/lib/compatibility";

// POST /api/extension/nearby-products
// Called by the Qoyl Chrome extension when a user enters a physical retailer.
// Returns the top-scored products for the user's hair profile that are
// carried by that retailer chain, with scores and a shopping link.
//
// Body:  { retailer: string }   e.g. "ulta", "target", "cvs"
// Auth:  Bearer token in Authorization header (required — scores are always
//        personalized; unauthenticated users get a 401 so the extension can
//        show a "sign in to get recommendations" prompt instead)
//
// Returns:
//   {
//     retailer: string,
//     products: Array<{
//       id: string, name: string, brandName: string | null,
//       score: number, tier: string,
//       searchUrl: string   // qoyl.live/search?q=... for shopping link
//     }>,
//     curlType: string | null
//   }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Retailer name aliases so "ulta", "Ulta", "Sally Beauty", "sally" all work.
const RETAILER_ALIASES: Record<string, string> = {
  ulta: "ulta",
  "sally beauty": "sally",
  "sally": "sally",
  target: "target",
  walmart: "walmart",
  cvs: "cvs",
  walgreens: "walgreens",
};

// How many top products to return per retailer visit.
const TOP_N = 5;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { error: "Sign in to Qoyl to get personalized recommendations." },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // ── Body ────────────────────────────────────────────────────────────────────
  const body = await request.json().catch(() => ({}));
  const rawRetailer: string =
    typeof body.retailer === "string" ? body.retailer.trim().toLowerCase() : "";
  const retailerKey = RETAILER_ALIASES[rawRetailer] ?? rawRetailer;

  if (!retailerKey) {
    return NextResponse.json(
      { error: "retailer is required." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ── Hair profile ────────────────────────────────────────────────────────────
  const { data: profileRow } = await admin
    .from("hair_profiles")
    .select("curl_type, porosity, scalp_condition, climate, water_hardness")
    .eq("user_id", user.id)
    .maybeSingle();

  const scoringProfile = buildScoringProfile(
    {
      curl_type: profileRow?.curl_type ?? null,
      porosity: profileRow?.porosity ?? "medium",
      scalp_condition: profileRow?.scalp_condition ?? "normal",
      climate: profileRow?.climate ?? "temperate",
      water_hardness: profileRow?.water_hardness ?? null,
    },
    profileRow?.climate ?? "temperate"
  );

  // ── Fetch candidate products for this retailer ──────────────────────────────
  // catalog_products may carry a retailer_tags column (array) or a separate
  // junction table. We use a text search on the retailer field if present,
  // otherwise fall back to a broad sample and filter client-side.
  // The catalog is assumed to have a "retailers" text[] or jsonb column.
  // If that column doesn't exist yet this falls back gracefully to all products.
  let productIds: string[] = [];

  // Try retailer-tagged products first.
  const { data: taggedRows } = await admin
    .from("catalog_products")
    .select("id")
    .contains("retailers", [retailerKey])
    .limit(200);

  if (taggedRows && taggedRows.length > 0) {
    productIds = taggedRows.map((r) => r.id);
  } else {
    // Fallback: score a broad sample across the whole catalog.
    // This is used while the retailers column is being populated.
    const { data: sampleRows } = await admin
      .from("catalog_products")
      .select("id")
      .limit(200);
    productIds = (sampleRows ?? []).map((r) => r.id);
  }

  if (productIds.length === 0) {
    return NextResponse.json(
      { retailer: retailerKey, products: [], curlType: profileRow?.curl_type ?? null },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // ── Score all candidates ────────────────────────────────────────────────────
  const scoreMap = await scoreCatalogProductsForProfile(productIds, scoringProfile);

  // ── Fetch product metadata for scored results ───────────────────────────────
  const scoredIds = Object.entries(scoreMap)
    .filter(([, v]) => v?.result != null)
    .sort(([, a], [, b]) => (b!.result!.normalizedScore) - (a!.result!.normalizedScore))
    .slice(0, TOP_N)
    .map(([id]) => id);

  if (scoredIds.length === 0) {
    return NextResponse.json(
      { retailer: retailerKey, products: [], curlType: profileRow?.curl_type ?? null },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const { data: productRows } = await admin
    .from("catalog_products")
    .select("id, name, catalog_brands(name)")
    .in("id", scoredIds);

  const metaMap = new Map(
    (productRows ?? []).map((r) => [
      r.id,
      {
        name: r.name as string,
        brandName: (r.catalog_brands as unknown as { name: string } | null)?.name ?? null,
      },
    ])
  );

  const products = scoredIds
    .map((id) => {
      const meta = metaMap.get(id);
      const entry = scoreMap[id];
      if (!meta || !entry?.result) return null;
      const score = Math.round(entry.result.normalizedScore);
      return {
        id,
        name: meta.name,
        brandName: meta.brandName,
        score,
        tier: scoreTier(score),
        searchUrl: `https://qoyl.live/search?q=${encodeURIComponent(meta.name)}`,
      };
    })
    .filter(Boolean);

  return NextResponse.json(
    {
      retailer: retailerKey,
      products,
      curlType: profileRow?.curl_type ?? null,
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
