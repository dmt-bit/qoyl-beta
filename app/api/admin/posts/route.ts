import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Read-only list backing the minimal /admin/posts page - posts
// themselves are still added/edited via direct SQL (same as everywhere
// else in this app), this just gives the "save to visual library"
// shortcut (item 6) somewhere to live.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: posts, error } = await getSupabaseAdmin()
    .from("posts")
    .select("slug, title, category, hero_image_url, hair_type, published_at")
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] });
}
