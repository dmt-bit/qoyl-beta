import { NextResponse } from "next/server";
import { getFallbackImage } from "@/lib/visualLibrary";

// Public bridge: getFallbackImage() needs the service role (it writes
// used_count), and the style inspo cards it backs are fetched
// client-side in MasonryFeed.tsx ("use client"), so this route exists
// the same way /api/style-match/brand-products does for a different
// client-side-fetched card type. Returns only an image URL - no
// sensitive data - so no auth gate is needed here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hairTypesParam = searchParams.get("hair_types");
  const category = searchParams.get("category") ?? undefined;
  const hair_types = hairTypesParam
    ? hairTypesParam.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;

  const url = await getFallbackImage({ hair_types, category });
  return NextResponse.json({ url });
}
