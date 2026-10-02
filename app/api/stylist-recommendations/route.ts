import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";

// POST body from components/StylistRecommendationBlock.tsx - used by
// Style Match's "book a stylist" empty state (results page + summary
// document) and the standalone app/recommend-a-stylist/page.tsx, all
// sharing this one route.
type RecommendationBody = {
  recommended_by?: string | null;
  stylist_name: string;
  stylist_instagram?: string | null;
  stylist_city?: string | null;
  stylist_website?: string | null;
  stylist_booking_url?: string | null;
  why_recommend?: string | null;
  style_specialty?: string | null;
  recommender_curl_type?: string | null;
  recommender_city?: string | null;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RecommendationBody;
  const stylistName = cleanString(body.stylist_name);

  if (!stylistName) {
    return NextResponse.json({ error: "Stylist name is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const recommendedBy = cleanString(body.recommended_by);
  const instagram = cleanString(body.stylist_instagram);

  const row = {
    recommended_by: recommendedBy,
    stylist_name: stylistName,
    stylist_instagram: instagram,
    stylist_city: cleanString(body.stylist_city),
    stylist_website: cleanString(body.stylist_website),
    stylist_booking_url: cleanString(body.stylist_booking_url),
    why_recommend: cleanString(body.why_recommend),
    style_specialty: cleanString(body.style_specialty),
    recommender_curl_type: cleanString(body.recommender_curl_type),
    recommender_city: cleanString(body.recommender_city),
  };

  const { error } = await admin.from("stylist_recommendations").insert(row);
  if (error) {
    console.error("[stylist-recommendations] insert failed:", error.message);
    return NextResponse.json({ error: "Couldn't save your recommendation. Try again." }, { status: 500 });
  }

  // Best-effort - a failure here never fails the request (item 5 below).
  admin
    .from("ml_events")
    .insert({
      user_id: recommendedBy,
      event_type: "stylist_recommended",
      metadata: {
        stylist_name: stylistName,
        stylist_city: row.stylist_city,
        style_context: row.style_specialty,
        has_instagram: Boolean(instagram),
        recommender_curl_type: row.recommender_curl_type,
        recommender_city: row.recommender_city,
      },
    })
    .then(({ error: mlEventError }) => {
      if (mlEventError) console.error("[stylist-recommendations] ml_events insert failed:", mlEventError.message);
    });

  // Recommender's email, when a signed-in user submitted this - looked
  // up server-side rather than trusting a client-supplied email string.
  let recommenderEmail = "not signed in";
  if (recommendedBy) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(recommendedBy);
      recommenderEmail = userData?.user?.email ?? "unknown";
    } catch (err) {
      console.error("[stylist-recommendations] getUserById failed:", err);
    }
  }

  const recommenderHairLine = [row.recommender_curl_type, row.recommender_city].filter(Boolean).join(" · ");

  // Do NOT email the recommender a confirmation (item 4) - the UI's
  // success state is enough; only the internal alert goes out.
  const emailResult = await sendNotificationEmail(
    `stylist recommendation — ${stylistName}${row.stylist_city ? ` · ${row.stylist_city}` : ""}`,
    `recommended by: ${recommenderEmail}
stylist: ${stylistName}
instagram: ${instagram ? `@${instagram}` : "not provided"}
city: ${row.stylist_city ?? "not provided"}
booking: ${row.stylist_booking_url ?? "not provided"}
why: ${row.why_recommend ?? "not provided"}
style context: ${row.style_specialty ?? "not provided"}
recommender hair: ${recommenderHairLine || "not provided"}

view all recommendations → ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://qoyl.live"}/admin/stylists`
  );
  if (!emailResult.sent) {
    console.error("[stylist-recommendations] notification email failed:", emailResult);
  }

  return NextResponse.json({ success: true });
}
