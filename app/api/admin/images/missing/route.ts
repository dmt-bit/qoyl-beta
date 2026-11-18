import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Returns all catalog_products that are missing image_url, for manual entry UI.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("catalog_products")
    .select("id, name, barcode, catalog_brands(name)")
    .is("image_url", null)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    name: string;
    barcode: string | null;
    catalog_brands: { name: string } | null;
  };

  const products = (data as unknown as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.catalog_brands?.name ?? null,
    barcode: row.barcode ?? null,
  }));

  return NextResponse.json({ products });
}
