import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type FollowUpRequestBody = {
  match_id?: string;
  user_id?: string;
  hair_photo_id?: string | null;
};

// Marks a style_matches row as followed-through once the user confirms
// (from the dashboard's "Did you do this style?" prompt - see
// components/StyleMatchFollowUp.tsx) they actually did the style,
// optionally tagging it to a hair_photos row they just uploaded.
// follow_up_photo_url stores the raw storage path (not a signed URL,
// which expires in an hour - see lib/hairPhotos.ts), looked up here
// server-side rather than trusted from the client.
export async function POST(request: Request) {
  const body: FollowUpRequestBody = await request.json();
  const { match_id, user_id, hair_photo_id } = body;

  if (!match_id || !user_id) {
    return NextResponse.json(
      { error: "match_id and user_id are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: match } = await admin
    .from("style_matches")
    .select("id, user_id")
    .eq("id", match_id)
    .maybeSingle();

  if (!match || match.user_id !== user_id) {
    return NextResponse.json({ error: "Style match not found." }, { status: 404 });
  }

  let followUpPhotoUrl: string | null = null;
  if (hair_photo_id) {
    const { data: photo } = await admin
      .from("hair_photos")
      .select("photo_url, user_id")
      .eq("id", hair_photo_id)
      .maybeSingle();
    if (photo && photo.user_id === user_id) {
      followUpPhotoUrl = photo.photo_url;
    }
  }

  const { error } = await admin
    .from("style_matches")
    .update({
      followed_through: true,
      followed_through_at: new Date().toISOString(),
      follow_up_photo_url: followUpPhotoUrl,
    })
    .eq("id", match_id);

  if (error) {
    console.error("[style-match/follow-up] Failed to update style_matches row:", error);
    return NextResponse.json(
      { error: "Couldn't save this. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
