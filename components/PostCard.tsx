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

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex flex-col overflow-hidden rounded-xl border border-bronze/30 transition-colors hover:border-bronze"
    >
      <div className={`relative w-full ${compact ? "h-28" : "h-40"}`}>
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
          <span className="absolute left-2 top-2 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold text-dark">
            ▶ Video
          </span>
        )}
        {isRepost && (
          <span className="absolute left-2 top-2 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold text-dark">
            ↗ Repost
          </span>
        )}

        {isVideo && post.video_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/90">
              <PlayIcon />
            </div>
          </div>
        )}
      </div>
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
        {!compact && isRepost && post.source_creator && (
          <p className="-mt-1 text-xs text-cream/50">
            Originally by{" "}
            {post.source_creator_url ? (
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(post.source_creator_url!, "_blank", "noopener,noreferrer");
                }}
                className="underline underline-offset-2 hover:text-cream/70"
              >
                @{post.source_creator}
              </span>
            ) : (
              `@${post.source_creator}`
            )}
          </p>
        )}
        {!compact && <p className="text-sm text-cream/70">{post.excerpt}</p>}
      </div>
    </Link>
  );
}
