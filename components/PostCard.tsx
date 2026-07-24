import Image from "next/image";
import Link from "next/link";

export type Post = {
  slug: string;
  title: string;
  category: string;
  hero_image_url: string | null;
  excerpt: string;
  published_at: string;
  hair_type?: string | null;
};

function CategoryLabel({ category }: { category: string }) {
  return (
    <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
      {category.replace(/-/g, " ")}
    </span>
  );
}

export default function PostCard({
  post,
  compact = false,
}: {
  post: Post;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-bronze/30 transition-colors hover:border-bronze"
    >
      {post.hero_image_url ? (
        <div className={`relative w-full ${compact ? "h-28" : "h-40"}`}>
          <Image
            src={post.hero_image_url}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={`w-full bg-gradient-to-br from-bronze/30 via-warm/10 to-dark ${
            compact ? "h-28" : "h-40"
          }`}
        />
      )}
      <div
        className={`flex flex-1 flex-col gap-2 ${compact ? "p-4" : "gap-3 p-5"}`}
      >
        <CategoryLabel category={post.category} />
        <h2
          className={`font-serif font-semibold text-cream ${
            compact ? "text-base" : "text-xl"
          }`}
        >
          {post.title}
        </h2>
        {!compact && <p className="text-sm text-cream/70">{post.excerpt}</p>}
      </div>
    </Link>
  );
}
