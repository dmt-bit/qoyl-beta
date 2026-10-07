import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { findMatchingService, type StructuredService } from "@/lib/styleMatchSummary";

export type StylistResult = {
  id: string;
  displayName: string;
  salonName: string | null;
  photoUrl: string | null;
  bookingUrl: string | null;
  // The stylist's own priced/timed entry for the requested style, if
  // their services_structured includes one (see the request's item 4
  // for the expected shape) - null when they have services listed but
  // not this specific one, or no structured services at all.
  matchedService: StructuredService | null;
  hasAnyServices: boolean;
  // Just names (not full pricing) of their other listed services, shown
  // as reference when they have services but not this specific one.
  otherServiceNames: string[];
};

// stylist_accounts is qoyl-business's table (shared Supabase project) -
// it holds contact_name/email/phone/stripe_customer_id/etc, none of
// which Style Match has any business exposing. Reading it here with the
// service-role key and returning only this hand-picked subset avoids
// ever needing an RLS policy or GRANT on the shared table - see
// supabase/create_style_match.sql for the fuller story.
export async function GET(request: Request) {
  console.log("[style-match/stylists] route hit");

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const curlType = searchParams.get("curl_type");
  const styleName = searchParams.get("style_name");

  if (!city) {
    return NextResponse.json({ stylists: [] });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("stylist_accounts")
    .select("id, display_name, salon_name, photo_url, booking_url, hair_types_served, services_structured")
    .ilike("city", city)
    .eq("status", "active")
    // Dashboard Section 1's toggle (qoyl-business, app/stylist/dashboard) -
    // a stylist can hide from matching without canceling their subscription.
    .eq("accepting_new_clients", true);

  if (error) {
    console.error("[style-match/stylists] Failed to query stylist_accounts:", error);
    return NextResponse.json({ stylists: [] });
  }

  const matching = (data ?? []).filter((s) =>
    curlType ? (s.hair_types_served ?? []).includes(curlType) : false
  );

  const stylists: StylistResult[] = matching.map((s) => {
    const matchedService = styleName ? findMatchingService(s.services_structured, styleName) : null;
    const allServices: { name?: unknown }[] = Array.isArray(s.services_structured)
      ? s.services_structured
      : [];
    return {
      id: s.id,
      displayName: s.display_name,
      salonName: s.salon_name,
      photoUrl: s.photo_url,
      bookingUrl: s.booking_url,
      matchedService,
      hasAnyServices: allServices.length > 0,
      otherServiceNames: allServices
        .map((svc) => (typeof svc?.name === "string" ? svc.name : null))
        .filter((name): name is string => Boolean(name) && name !== matchedService?.name),
    };
  });

  console.log("[style-match/stylists] found stylists:", stylists.length);
  return NextResponse.json({ stylists });
}
