import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import CompatibilitySection from "@/components/CompatibilitySection";
import CommentSection from "@/components/CommentSection";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter",
};

// source_platform is meant for repost attribution ("originally on TikTok")
// and is often left blank for original-video posts -- there's no "source"
// to attribute when the video is Qoyl's own. Detecting the embed platform
// from the video_url itself means the embed still renders correctly even
// when source_platform isn't set.
function detectEmbedPlatform(url: string): "youtube" | "tiktok" | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return null;
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/embed/")[1] || null;
      }
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

function VideoEmbed({
  videoUrl,
  platform,
  title,
}: {
  videoUrl: string;
  platform: string | null;
  title: string;
}) {
  if (platform === "youtube") {
    const id = getYouTubeId(videoUrl);
    if (!id) return null;
    return (
      <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  if (platform === "tiktok") {
    return (
      <>
        <div className="mt-6 flex justify-center">
          <blockquote
            className="tiktok-embed"
            cite={videoUrl}
            style={{ maxWidth: "605px", minWidth: "325px", width: "100%" }}
          >
            <section />
          </blockquote>
        </div>
        <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
      </>
    );
  }

  // No embed support yet for other platforms (instagram/twitter) -- link
  // out rather than show a broken embed.
  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-6 flex aspect-video w-full items-center justify-center rounded-xl border border-bronze/30 bg-warm/[0.03] text-sm text-bronze2 underline underline-offset-2"
    >
      Watch the original video →
    </a>
  );
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!post) {
    notFound();
  }

  const { data: comments } = await supabase
    .from("post_comments")
    .select("id, display_name, body, created_at")
    .eq("post_slug", params.slug)
    .eq("approved", true)
    .order("created_at", { ascending: true });

  const isVideoContent =
    post.content_type === "original-video" || post.content_type === "repost";
  const embedPlatform = post.video_url
    ? detectEmbedPlatform(post.video_url) ?? post.source_platform
    : null;
  const platformLabel = post.source_platform
    ? PLATFORM_LABEL[post.source_platform] ?? post.source_platform
    : null;

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <article className="mx-auto max-w-2xl">
        <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
          {post.category.replace(/-/g, " ")}
        </span>

        <h1 className="mt-4 font-serif text-3xl font-semibold text-cream sm:text-4xl">
          {post.title}
        </h1>

        {isVideoContent && post.video_url ? (
          <VideoEmbed
            videoUrl={post.video_url}
            platform={embedPlatform}
            title={post.title}
          />
        ) : (
          post.hero_image_url && (
            <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl">
              <Image
                src={post.hero_image_url}
                alt={post.title}
                fill
                sizes="(min-width: 768px) 672px, 100vw"
                className="object-cover"
              />
            </div>
          )
        )}

        {post.content_type === "repost" && post.source_creator && (
          <div className="mt-6 rounded-lg border border-bronze/30 bg-bronze/5 p-4 text-sm text-cream/70">
            This content was originally created by{" "}
            {post.source_creator_url ? (
              <a
                href={post.source_creator_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-bronze2 underline underline-offset-2 hover:text-cream"
              >
                @{post.source_creator}
              </a>
            ) : (
              <span className="font-medium text-bronze2">
                @{post.source_creator}
              </span>
            )}
            {platformLabel ? ` on ${platformLabel}` : ""}. We&apos;re sharing
            it because it&apos;s relevant to your hair care journey. All
            credit to the original creator.
          </div>
        )}

        <div className="prose-invert mt-8 space-y-4 text-cream/90 [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-cream [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:leading-relaxed [&_strong]:text-cream [&_ul]:list-disc [&_ul]:space-y-2">
          <ReactMarkdown>{post.body}</ReactMarkdown>
        </div>

        {post.related_product_name && (
          <CompatibilitySection productName={post.related_product_name} />
        )}

        <CommentSection
          postSlug={post.slug}
          postTitle={post.title}
          initialComments={comments ?? []}
        />
      </article>
    </main>
  );
}
