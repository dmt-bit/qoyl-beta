import { NextResponse } from "next/server";
import { getMarketEstimate } from "@/lib/styleMatchSummary";

// Market-rate fallback for the Book a Stylist tab when no Qoyl stylist
// matched the user's city (item 6) - reads style_price_estimates via
// the service-role client rather than granting the table anon access.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const styleName = searchParams.get("style_name");

  if (!styleName) {
    return NextResponse.json({ estimate: null });
  }

  const estimate = await getMarketEstimate(styleName);
  return NextResponse.json({ estimate });
}
