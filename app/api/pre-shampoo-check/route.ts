import { NextResponse } from "next/server";
import { hasPreShampooPick } from "@/lib/routineProducts";

// Tiny server-only bridge for /search's "consider adding a pre-shampoo"
// recommendation card - lib/routineProducts.ts uses getSupabaseAdmin, so
// the client search page can't call hasPreShampooPick directly.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const curlType = searchParams.get("curl_type");
  const porosity = searchParams.get("porosity");

  try {
    const hasPick = await hasPreShampooPick(porosity, curlType);
    return NextResponse.json({ hasPick });
  } catch (error) {
    console.error("[pre-shampoo-check] failed:", error);
    // Fails closed (assume they have one) so the card never shows on an
    // error rather than nagging every user any time this route hiccups.
    return NextResponse.json({ hasPick: true });
  }
}
