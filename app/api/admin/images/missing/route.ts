import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Returns catalog_products for manual image entry UI.
// ?mode=missing (default) — only products without image_url
// ?mode=all — all products including those with image_url
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "missing";

  const admin = getSupabaseAdmin();

  let query = admin
    .from("catalog_products")
    .select("id, name, barcode, image_url, catalog_brands(name)")
    .order("name", { ascending: true });

  if (mode === "missing") {
    query = query.is("image_url", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    name: string;
    barcode: string | null;
    image_url: string | null;
    catalog_brands: { name: string } | null;
  };

  const products = (data as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.catalog_brands?.name ?? null,
    barcode: row.barcode ?? null,
    image_url: row.image_url ?? null,
  }));

  return NextResponse.json({ products });
}
