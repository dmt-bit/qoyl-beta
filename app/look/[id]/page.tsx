import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CartItem } from "@/lib/styleCart";
import CompleteYourLookCart from "@/components/CompleteYourLookCart";

export const dynamic = "force-dynamic";

// Public, no login required - item 5's share link. Fetches directly
// (same pattern as app/events/[slug]/page.tsx calling lib/events.ts)
// rather than round-tripping through /api/style-cart/[id] from a
// server component.
export default async function LookPage({ params }: { params: { id: string } }) {
  const { data: cart } = await getSupabaseAdmin()
    .from("style_cart")
    .select("id, items")
    .eq("id", params.id)
    .maybeSingle();

  if (!cart) notFound();

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <div className="mx-auto max-w-2xl">
        <CompleteYourLookCart cartId={cart.id} items={(cart.items as CartItem[]) ?? []} />
      </div>
    </main>
  );
}
