import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CartItem } from "@/lib/styleCart";
import ShowerShelfCart from "@/components/ShowerShelfCart";

export const dynamic = "force-dynamic";

// /cart/[id] — the shower shelf checkout experience.
// Same data as /look/[id] but rendered with the shelf visual design.
export default async function CartPage({ params }: { params: { id: string } }) {
  const { data: cart } = await getSupabaseAdmin()
    .from("style_cart")
    .select("id, items")
    .eq("id", params.id)
    .maybeSingle();

  if (!cart) notFound();

  return (
    <main className="min-h-screen bg-[#F7F5F2] font-sans text-dark">
      <ShowerShelfCart cartId={cart.id} items={(cart.items as CartItem[]) ?? []} />
    </main>
  );
}
