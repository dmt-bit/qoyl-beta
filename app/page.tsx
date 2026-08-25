import FloatingProfileCTA from "@/components/FloatingProfileCTA";
import MasonryFeed from "@/components/MasonryFeed";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Feed-only home page - no hero, no headline, no CTA section. The side
// nav rail (components/Nav.tsx, shown only on this route) replaces the
// top nav entirely here, and FloatingProfileCTA below replaces the old
// hero's "Build my free hair profile" button for visitors who still
// need a path into /profile.
export default async function Home() {
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "slug, title, category, hero_image_url, excerpt, published_at, hair_type, body, content_type, source_creator, source_creator_url, source_platform, video_url"
    )
    .order("published_at", { ascending: false });

  return (
    <main className="min-h-screen bg-dark px-4 pb-12 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-5xl">
        <MasonryFeed posts={posts ?? []} />
      </div>
      <FloatingProfileCTA />
    </main>
  );
}
