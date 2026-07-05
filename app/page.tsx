import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Post = {
  slug: string;
  title: string;
  category: string;
  hero_image_url: string | null;
  excerpt: string;
  published_at: string;
};

function CategoryLabel({ category }: { category: string }) {
  return (
    <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
      {category.replace(/-/g, " ")}
    </span>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-bronze/30 transition-colors hover:border-bronze"
    >
      {post.hero_image_url ? (
        <div className="relative h-40 w-full">
          <Image
            src={post.hero_image_url}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-bronze/30 via-warm/10 to-dark" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <CategoryLabel category={post.category} />
        <h2 className="font-serif text-xl font-semibold text-cream">
          {post.title}
        </h2>
        <p className="text-sm text-cream/70">{post.excerpt}</p>
      </div>
    </Link>
  );
}

export default async function Home() {
  const { data: posts } = await supabase
    .from("posts")
    .select("slug, title, category, hero_image_url, excerpt, published_at")
    .order("published_at", { ascending: false });

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-semibold text-cream sm:text-4xl">
          Qoyl
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          Ingredient breakdowns and product evaluations for type 4 hair.
        </p>

        {posts && posts.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-cream/50">No posts yet.</p>
        )}
      </div>
    </main>
  );
}
