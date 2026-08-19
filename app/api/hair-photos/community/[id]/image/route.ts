import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { downloadHairPhotoAsBase64 } from "@/lib/hairPhotos";

// Feeds the "Style Match this ->" bridge from the community feed modal
// into Style Match's photo-input flow -- returns raw base64 instead of a
// signed URL since Style Match's analyze route needs base64 anyway.
// Only ever serves photos already flagged is_public=true (re-checked
// here server-side, not trusted from the client) -- this never exposes
// a private photo even if someone guesses/reuses an id.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { data: row } = await getSupabaseAdmin()
    .from("hair_photos")
    .select("photo_url, is_public")
    .eq("id", params.id)
    .maybeSingle();

  if (!row || !row.is_public) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const image = await downloadHairPhotoAsBase64(row.photo_url);
  if (!image) {
    return NextResponse.json({ error: "Couldn't load photo." }, { status: 500 });
  }

  return NextResponse.json(image);
}
