import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { deleteHairPhotoObject } from "@/lib/hairPhotos";

async function verifyOwnership(id: string, userId: string) {
  const { data } = await getSupabaseAdmin()
    .from("hair_photos")
    .select("id, user_id, photo_url")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data;
}

// PATCH - toggle is_public (the only field the profile UI edits after
// creation).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { user_id, is_public }: { user_id?: string; is_public?: boolean } = body;

  if (!user_id || typeof is_public !== "boolean") {
    return NextResponse.json({ error: "user_id and is_public are required." }, { status: 400 });
  }

  const owned = await verifyOwnership(params.id, user_id);
  if (!owned) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const { error } = await getSupabaseAdmin()
    .from("hair_photos")
    .update({ is_public })
    .eq("id", params.id);

  if (error) {
    console.error("[hair-photos] Failed to update visibility:", error);
    return NextResponse.json({ error: "Couldn't update photo. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const owned = await verifyOwnership(params.id, userId);
  if (!owned) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  await deleteHairPhotoObject(owned.photo_url);

  const { error } = await getSupabaseAdmin().from("hair_photos").delete().eq("id", params.id);
  if (error) {
    console.error("[hair-photos] Failed to delete row:", error);
    return NextResponse.json({ error: "Couldn't delete photo. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
