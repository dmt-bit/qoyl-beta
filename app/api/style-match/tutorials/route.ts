import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// posts' RLS policy ("Allow anon select", supabase/create_posts.sql)
// only grants the anon role read access, not authenticated - so a
// signed-in user's browser client (which sends their session JWT and is
// evaluated as authenticated, not anon) gets zero rows back from a
// direct client-side query. That's a pre-existing gap affecting other
// features too (e.g. the dashboard's "From the Qoyl feed" section is
// silently empty for every signed-in user) - out of scope to fix here,
// so this route sidesteps it the same way app/api/style-match/stylists
// does: read with the service-role key server-side instead.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const styleName = searchParams.get("style_name") ?? "";
  const hairTypeFamily = searchParams.get("hair_type_family");

  const { data, error } = await getSupabaseAdmin()
    .from("posts")
    .select("slug, title, category, hero_image_url, excerpt, published_at, hair_type, content_type")
    .eq("content_type", "tutorial")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[style-match/tutorials] Failed to query posts:", error);
    return NextResponse.json({ posts: [] });
  }

  const styleWords = styleName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const matching = (data ?? []).filter((p) => {
    const matchesHairType =
      hairTypeFamily && (p.hair_type === hairTypeFamily || p.hair_type === "all");
    const haystack = `${p.title} ${p.category}`.toLowerCase();
    const matchesStyle = styleWords.some((w) => haystack.includes(w));
    return matchesHairType || matchesStyle;
  });

  return NextResponse.json({ posts: matching });
}
