import Link from "next/link";
import HairTypeStrip from "@/components/HairTypeStrip";
import MasonryFeed from "@/components/MasonryFeed";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: posts } = await supabase
    .from("posts")
    .select(
      "slug, title, category, hero_image_url, excerpt, published_at, hair_type, body, content_type, source_creator, source_creator_url, source_platform, video_url"
    )
    .order("published_at", { ascending: false });

  return (
    <main className="min-h-screen bg-dark font-sans text-cream">
      {/* 1. HERO - unchanged */}
      <section className="relative flex h-[85vh] flex-col items-center justify-center overflow-hidden bg-dark px-4 sm:h-[90vh]">
        <div className="hero-anim-wordmark flex flex-col items-center">
          <h1 className="text-center font-serif text-5xl italic text-cream sm:text-6xl">
            Qoyl
          </h1>
          <div className="mt-3 h-px w-10 bg-bronze" />
        </div>

        <HairTypeStrip tileSize={160} className="hero-anim-strip mt-12 sm:mt-16" />

        <h2 className="hero-anim-headline mt-12 max-w-xs text-center font-serif text-[28px] italic leading-[1.2] text-cream sm:mt-16 sm:max-w-md sm:text-4xl">
          Finally know what your hair actually needs.
        </h2>

        <Link
          href="/profile"
          className="hero-anim-cta mx-4 mt-8 flex h-[52px] w-[calc(100%-32px)] items-center justify-center rounded-full bg-bronze px-6 text-center font-sans text-sm font-semibold text-cream transition-colors hover:bg-bronze2 sm:mt-10 sm:w-auto sm:px-10"
        >
          Build my free hair profile →
        </Link>
      </section>

      {/* 2. THE FEED - immediately after the hero, nothing in between.
          MasonryFeed already renders its own "The feed" eyebrow. */}
      <div className="fade-up-block border-b border-bronze/20 bg-dark px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <MasonryFeed posts={posts ?? []} />
        </div>
      </div>
    </main>
  );
}
