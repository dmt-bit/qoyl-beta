import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import CompatibilitySection from "@/components/CompatibilitySection";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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

  return (
    <main className="min-h-screen bg-dark px-4 py-10 font-sans text-cream sm:px-6">
      <article className="mx-auto max-w-2xl">
        <span className="inline-block rounded-full border border-bronze/40 px-3 py-1 text-xs font-medium capitalize text-bronze2">
          {post.category.replace(/-/g, " ")}
        </span>

        <h1 className="mt-4 font-serif text-3xl font-semibold text-cream sm:text-4xl">
          {post.title}
        </h1>

        {post.hero_image_url && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl">
            <Image
              src={post.hero_image_url}
              alt={post.title}
              fill
              sizes="(min-width: 768px) 672px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="prose-invert mt-8 space-y-4 text-cream/90 [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-cream [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:leading-relaxed [&_strong]:text-cream [&_ul]:list-disc [&_ul]:space-y-2">
          <ReactMarkdown>{post.body}</ReactMarkdown>
        </div>

        {post.related_product_name && (
          <CompatibilitySection productName={post.related_product_name} />
        )}
      </article>
    </main>
  );
}
