import Image from "next/image";
import Link from "next/link";

export type ContentType = "article" | "original-video" | "repost";

export type Post = {
  slug: string;
  title: string;
  category: string;
  hero_image_url: string | null;
  excerpt: string;
  published_at: string;
  hair_type?: string | null;
  body?: string;
  content_type?: ContentType | null;
  source_creator?: string | null;
  source_creator_url?: string | null;
  source_platform?: string | null;
  video_url?: string | null;
  // Resolved server-side (see app/page.tsx) from the visual library
  // when hero_image_url is null - only ever set alongside a null
  // hero_image_url, never fetched per-render.
  fallback_image_url?: string | null;
};

function CategoryLabel({ category }: { category: string }) {
  return (
    <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
      {category.replace(/-/g, " ")}
    </span>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5 text-dark" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export default function PostCard({
  post,
  compact = false,
}: {
  post: Post;
  compact?: boolean;
}) {
  const isVideo = post.content_type === "original-video";
  const isRepost = post.content_type === "repost";

  // Compact - used by /dashboard's "recently viewed" style rows -
  // keeps its original small-horizontal-card look, untouched.
  if (compact) {
    return (
      <Link
        href={`/posts/${post.slug}`}
        className="flex flex-col overflow-hidden border border-[#e8e8e8] transition-colors hover:border-bronze"
      >
        <div className="relative h-28 w-full">
          {post.hero_image_url ? (
            <Image
              src={post.hero_image_url}
              alt={post.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-bronze/30 via-warm/10 to-dark" />
          )}
          {isVideo && (
            <span className="absolute left-2 top-2 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold text-cream">
              ▶ Video
            </span>
          )}
          {isRepost && (
            <span className="absolute left-2 top-2 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold text-cream">
              ↗ Repost
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <CategoryLabel category={post.category} />
          <h2 className="font-serif text-base font-semibold text-dark">
            {post.title}
          </h2>
        </div>
      </Link>
    );
  }

  // Instagram-grid tile: perfect square, image dominant, title + hair-type
  // pill overlaid on a bottom gradient, no excerpt (that only shows on the
  // post detail page).
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group relative block aspect-square w-full overflow-hidden bg-[#ffffff]"
    >
      {post.hero_image_url ? (
        <Image
          src={post.hero_image_url}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#ffffff] to-[#f5f5f5]" />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/75 to-transparent" />

      {(isVideo || isRepost) && (
        <span className="absolute left-2 top-2 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold text-cream">
          {isVideo ? "▶ Video" : "↗ Repost"}
        </span>
      )}

      {post.hair_type && (
        <span className="absolute right-2 top-2 rounded-full bg-[#ffffff] px-2 py-1 text-[8px] font-medium uppercase tracking-wide text-bronze">
          {post.hair_type}
        </span>
      )}

      {isVideo && post.video_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/90">
            <PlayIcon />
          </div>
        </div>
      )}

      <h2 className="absolute bottom-0 left-0 right-0 line-clamp-2 p-[10px] font-serif text-sm leading-tight text-dark">
        {post.title}
      </h2>
    </Link>
  );
}
