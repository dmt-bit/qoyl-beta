import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// catalog_brands, not "brands" - see the comment above
// QOYL_PRODUCT_SELECT in app/search/page.tsx: this Supabase project is
// shared with qoyl-business, which has its own unrelated brands table.
//
// logo_url/description only exist once supabase/add_brand_directory.sql
// has been run - selecting "*" rather than an explicit column list so
// this route doesn't 500 pre-migration.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: brands, error: brandsError } = await admin.from("catalog_brands").select("*").order("name");
  if (brandsError || !brands) {
    return NextResponse.json({ error: brandsError?.message ?? "Failed to load brands." }, { status: 500 });
  }

  // average_score doesn't exist until supabase/add_brand_directory.sql is
  // run - naming it explicitly errors the whole query out (Postgrest
  // "column does not exist"), which would take brand_id/counts down with
  // it, so this falls back to the same query without it.
  const { data: productRowsWithScore, error: productsError } = await admin
    .from("catalog_products")
    .select("brand_id, average_score");
  const productRows = productsError
    ? ((await admin.from("catalog_products").select("brand_id")).data ?? []).map((r) => ({
        ...r,
        average_score: null as number | null,
      }))
    : productRowsWithScore ?? [];

  const countByBrand = new Map<string, number>();
  const scoreSumByBrand = new Map<string, { sum: number; n: number }>();
  for (const row of productRows ?? []) {
    if (!row.brand_id) continue;
    countByBrand.set(row.brand_id, (countByBrand.get(row.brand_id) ?? 0) + 1);
    if (typeof row.average_score === "number") {
      const agg = scoreSumByBrand.get(row.brand_id) ?? { sum: 0, n: 0 };
      agg.sum += row.average_score;
      agg.n += 1;
      scoreSumByBrand.set(row.brand_id, agg);
    }
  }

  const withStats = brands.map((b) => {
    const agg = scoreSumByBrand.get(b.id);
    return {
      ...b,
      product_count: countByBrand.get(b.id) ?? 0,
      avg_score: agg ? Math.round(agg.sum / agg.n) : null,
    };
  });

  return NextResponse.json({ brands: withStats });
}

// "Add brand" (item 5) - creates a catalog_brands row with no product
// required yet, so a brand can be added before any of its SKUs are.
export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
  }

  const slug =
    (body.slug ?? "").trim() ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("catalog_brands")
    .insert({
      name,
      slug,
      description: body.description?.trim() || null,
      logo_url: body.logo_url?.trim() || null,
      website: body.website_url?.trim() || body.website?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    // Most likely cause pre-migration: logo_url/description don't exist
    // yet (see supabase/add_brand_directory.sql) - surfaced plainly
    // rather than a generic 500 so it's obvious what to run.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brand: data }, { status: 201 });
}
