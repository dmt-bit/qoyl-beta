import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type StylistResult = {
  id: string;
  displayName: string;
  salonName: string | null;
  photoUrl: string | null;
  bookingUrl: string | null;
};

// stylist_accounts is qoyl-business's table (shared Supabase project) --
// it holds contact_name/email/phone/stripe_customer_id/etc, none of
// which Style Match has any business exposing. Reading it here with the
// service-role key and returning only this hand-picked subset avoids
// ever needing an RLS policy or GRANT on the shared table -- see
// supabase/create_style_match.sql for the fuller story.
export async function GET(request: Request) {
  console.log("[style-match/stylists] route hit");

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const curlType = searchParams.get("curl_type");

  if (!city) {
    return NextResponse.json({ stylists: [] });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("stylist_accounts")
    .select("id, display_name, salon_name, photo_url, booking_url, hair_types_served")
    .ilike("city", city)
    .eq("status", "active");

  if (error) {
    console.error("[style-match/stylists] Failed to query stylist_accounts:", error);
    return NextResponse.json({ stylists: [] });
  }

  const matching = (data ?? []).filter((s) =>
    curlType ? (s.hair_types_served ?? []).includes(curlType) : false
  );

  const stylists: StylistResult[] = matching.map((s) => ({
    id: s.id,
    displayName: s.display_name,
    salonName: s.salon_name,
    photoUrl: s.photo_url,
    bookingUrl: s.booking_url,
  }));

  console.log("[style-match/stylists] found stylists:", stylists.length);
  return NextResponse.json({ stylists });
}
