import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// [edit] on /admin/products' Brands tab - updates name/slug/description/
// logo_url/website. See app/api/admin/brands/route.ts for why these are
// on catalog_brands, and why logo_url/description need
// supabase/add_brand_directory.sql run before this will succeed.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, string | null> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.slug === "string") update.slug = body.slug.trim();
  if (typeof body.description === "string") update.description = body.description.trim() || null;
  if (typeof body.logo_url === "string") update.logo_url = body.logo_url.trim() || null;
  if (typeof body.website_url === "string") update.website = body.website_url.trim() || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("catalog_brands")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brand: data });
}
