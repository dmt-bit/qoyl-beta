import { NextResponse } from "next/server";
import { getPartnerBrandNames } from "@/lib/brandPartners";

// Public bridge: brand_accounts has RLS blocking anon reads (it carries
// contact_name/email/stripe ids - see lib/brandPartners.ts), so
// app/search/page.tsx ("use client") fetches this instead of querying
// brand_accounts directly, the same pattern as /api/visual-library/fallback
// and /api/newsletter/subscribe. Returns only lowercased brand names -
// nothing sensitive.
export async function GET() {
  const names = await getPartnerBrandNames();
  return NextResponse.json({ partnerBrandNames: Array.from(names) });
}

export const dynamic = "force-dynamic";
