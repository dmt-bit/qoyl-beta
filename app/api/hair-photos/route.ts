import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSignedHairPhotoUrl, uploadHairPhoto } from "@/lib/hairPhotos";

export type HairPhotoResult = {
  id: string;
  url: string;
  caption: string | null;
  hairLength: string | null;
  isPublic: boolean;
  takenAt: string;
};

// GET ?user_id= - the signed-in user's own photos, newest first, with
// freshly-signed URLs (hair-photos is a private bucket).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("hair_photos")
    .select("id, photo_url, caption, hair_length, is_public, taken_at")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false });

  if (error) {
    console.error("[hair-photos] Failed to list photos:", error);
    return NextResponse.json({ photos: [] });
  }

  const photos: HairPhotoResult[] = (
    await Promise.all(
      (data ?? []).map(async (row) => {
        const url = await getSignedHairPhotoUrl(row.photo_url);
        if (!url) return null;
        return {
          id: row.id,
          url,
          caption: row.caption,
          hairLength: row.hair_length,
          isPublic: row.is_public,
          takenAt: row.taken_at,
        };
      })
    )
  ).filter((p): p is HairPhotoResult => p !== null);

  return NextResponse.json({ photos });
}

// POST - upload a new hair photo. Trusts user_id from the body, same
// pattern as the rest of this codebase's client-triggered server routes.
export async function POST(request: Request) {
  const body = await request.json();
  const {
    user_id,
    image_base64,
    image_media_type,
    filename,
    caption,
    hair_length,
    is_public,
  }: {
    user_id?: string;
    image_base64?: string;
    image_media_type?: string;
    filename?: string;
    caption?: string | null;
    hair_length?: string | null;
    is_public?: boolean;
  } = body;

  if (!user_id || !image_base64 || !image_media_type) {
    return NextResponse.json(
      { error: "user_id, image_base64, and image_media_type are required." },
      { status: 400 }
    );
  }

  const path = await uploadHairPhoto(user_id, image_base64, image_media_type, filename ?? "photo.jpg");
  if (!path) {
    return NextResponse.json({ error: "Couldn't upload photo. Please try again." }, { status: 500 });
  }

  const { data: row, error } = await getSupabaseAdmin()
    .from("hair_photos")
    .insert({
      user_id,
      photo_url: path,
      caption: caption ?? null,
      hair_length: hair_length ?? null,
      is_public: Boolean(is_public),
    })
    .select("id, photo_url, caption, hair_length, is_public, taken_at")
    .single();

  if (error || !row) {
    console.error("[hair-photos] Failed to insert row:", error);
    return NextResponse.json({ error: "Couldn't save photo. Please try again." }, { status: 500 });
  }

  const url = await getSignedHairPhotoUrl(row.photo_url);

  const result: HairPhotoResult = {
    id: row.id,
    url: url ?? "",
    caption: row.caption,
    hairLength: row.hair_length,
    isPublic: row.is_public,
    takenAt: row.taken_at,
  };
  return NextResponse.json({ photo: result });
}
