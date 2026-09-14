import Link from "next/link";
import PostFilterGrid from "@/components/PostFilterGrid";
import { isTabKey } from "@/lib/postTabs";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "slug, title, category, hero_image_url, excerpt, published_at, hair_type, body, content_type, source_creator, source_creator_url, source_platform, video_url"
    )
    .order("published_at", { ascending: false });

  const initialTab = isTabKey(searchParams.type) ? searchParams.type : "all";

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm text-dark/50 underline underline-offset-2 hover:text-dark/70"
        >
          ← Back to home
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-bronze">
          From the Qoyl feed
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-dark sm:text-4xl">
          All posts
        </h1>
        <p className="mt-2 text-sm text-dark/70">
          Ingredient breakdowns, product evaluations, and hair science for
          every texture.
        </p>

        <div className="mt-6">
          <PostFilterGrid
            posts={posts ?? []}
            initialTab={initialTab}
            limit={null}
            showSeeAllLinks={false}
          />
        </div>
      </div>
    </main>
  );
}
