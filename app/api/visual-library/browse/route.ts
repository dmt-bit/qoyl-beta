import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Returns active visual library images for the browse strip on
// /style-match. Gender-aware: if gender=male is passed, mens-tagged
// images are sorted to the front while still including everything else.
// No auth required - images are public, URLs are already public storage.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gender = searchParams.get("gender"); // "male" | null
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "40", 10), 80);

  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("visual_library")
    .select("id, image_url, alt_text, hair_types, categories, mood")
    .eq("is_active", true)
    .order("used_count", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let images = data ?? [];

  // Prioritize mens-tagged photos for male users, keeping all images
  // visible so they can scroll through the full library.
  if (gender === "male") {
    const mens = images.filter((i) => i.hair_types?.includes("mens"));
    const rest = images.filter((i) => !i.hair_types?.includes("mens"));
    images = [...mens, ...rest];
  }

  return NextResponse.json({ images });
}
