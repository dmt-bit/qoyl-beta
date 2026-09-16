import FloatingProfileCTA from "@/components/FloatingProfileCTA";
import MasonryFeed from "@/components/MasonryFeed";
import { supabase } from "@/lib/supabase";
import { getFallbackImage } from "@/lib/visualLibrary";

export const dynamic = "force-dynamic";

// posts.category values ("general", "ingredient-evaluation", ...) are a
// free-text editorial taxonomy, not the visual_library.categories enum
// (ingredients/product/lifestyle/texture/style/scalp/routine) - this is
// a best-effort mapping between the two rather than a real 1:1 match.
function toVisualCategory(postCategory: string): string {
  if (postCategory === "ingredient-evaluation") return "ingredients";
  return "lifestyle";
}

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

  // Fallback images resolved once here, server-side, and carried on the
  // post object into the feed - not re-fetched on every card render, so
  // a given post's fallback doesn't change on every page load within
  // the same server response.
  const postsWithFallback = await Promise.all(
    (posts ?? []).map(async (post) => {
      if (post.hero_image_url) return { ...post, fallback_image_url: null };
      const fallback_image_url = await getFallbackImage({
        hair_types: post.hair_type ? [post.hair_type] : undefined,
        category: toVisualCategory(post.category),
      });
      return { ...post, fallback_image_url };
    })
  );

  return (
    <main className="min-h-screen bg-white px-4 pb-12 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-5xl">
        <MasonryFeed posts={postsWithFallback} />
      </div>
      <FloatingProfileCTA />
    </main>
  );
}
