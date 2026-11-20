import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// /look/[id] redirects to /cart/[id] — the shower shelf cart experience.
// Old share links continue to work; the redirect is permanent.
export default async function LookPage({ params }: { params: { id: string } }) {
  const { data: cart } = await getSupabaseAdmin()
    .from("style_cart")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!cart) notFound();

  redirect(`/cart/${params.id}`);
}
