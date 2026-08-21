import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSignedHairPhotoUrl } from "@/lib/hairPhotos";

// This route reads no part of the request (no searchParams/headers/
// cookies), which makes Next.js eligible to statically cache it by
// default - confirmed the hard way: it served an empty result forever
// after the first (legitimately empty, pre-any-public-photo) request.
export const dynamic = "force-dynamic";

export type CommunityPhoto = {
  id: string;
  url: string;
  caption: string | null;
  curlType: string | null;
  porosity: string | null;
};

// Public community feed (Part 4) - deliberately no user names/ids
// returned to the client, just hair-type context. hair_profiles isn't
// embeddable via a PostgREST foreign-key join here (hair_photos.user_id
// isn't declared as a FK to hair_profiles), so profiles are fetched
// separately and merged server-side.
//
// ?limit= lets callers ask for more than the original 9-photo grid needs
// - the home page masonry feed samples from the most recent 20.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get("limit") ?? "9", 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 9;

  const admin = getSupabaseAdmin();

  const { data: photos, error } = await admin
    .from("hair_photos")
    .select("id, user_id, photo_url, caption")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !photos || photos.length === 0) {
    if (error) console.error("[hair-photos/community] Failed to list photos:", error);
    return NextResponse.json({ photos: [] });
  }

  const userIds = Array.from(new Set(photos.map((p) => p.user_id)));
  const { data: profiles } = await admin
    .from("hair_profiles")
    .select("user_id, curl_type, porosity")
    .in("user_id", userIds);

  const profileByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const results: CommunityPhoto[] = (
    await Promise.all(
      photos.map(async (p) => {
        const url = await getSignedHairPhotoUrl(p.photo_url);
        if (!url) return null;
        const profile = profileByUserId.get(p.user_id);
        return {
          id: p.id,
          url,
          caption: p.caption,
          curlType: profile?.curl_type ?? null,
          porosity: profile?.porosity ?? null,
        };
      })
    )
  ).filter((p): p is CommunityPhoto => p !== null);

  return NextResponse.json({ photos: results });
}
