import { supabase } from "./supabase";

// Client-side logger for ml_events (see supabase/create_ml_events.sql).
// Best-effort, fire-and-forget - a failure here must never surface to the
// user or interrupt the flow it's instrumenting.
//
// With the paywall gone, every search/match is now free, so the
// anonymous/no-profile/profiled split is the main signal for how well the
// "create a profile" funnel is converting, and which slice of traffic is
// actually worth training on (profiled searches carry a real hair profile,
// anonymous/no-profile ones don't).
export type MlEventType =
  | "search_anonymous"
  | "search_no_profile"
  | "search_profiled"
  | "style_match_profile_gate_shown"
  | "style_match_profile_created"
  | "travel_kit_purchased_299"
  // Brand directory/catalog (/search's Brands tab, see app/search/page.tsx) -
  // direct signal for which brands users are most curious about, for
  // prioritizing new SKUs and B2B brand pitches.
  | "brand_catalog_view"
  | "brand_search"
  // Anonymous teaser/blur-gate conversion funnel (see BlurGate in
  // app/search/page.tsx) - the primary anonymous -> profiled conversion
  // metric: what fraction of people who see the gate tap through.
  | "blur_gate_shown"
  | "blur_gate_cta_tapped"
  | "blur_gate_signin_tapped"
  // "Recommend a stylist" (Style Match's "book a stylist" empty state,
  // app/api/stylist-recommendations/route.ts logs this server-side
  // directly via the admin client, same pattern as /api/routine's
  // missing_daily_product - not through logMlEvent below) - signals
  // which cities/styles/hair types are most underserved by stylists.
  | "stylist_recommended"
  // Routine-level interaction flags (see lib/routineInteractions.ts).
  // routine_flags_generated is logged server-side from /api/routine; the
  // read/dismiss events are client-side taps on the routine page.
  | "routine_flags_generated"
  | "routine_flag_read"
  | "routine_flag_dismissed";

export async function logMlEvent(
  eventType: MlEventType,
  params: { userId?: string | null; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await supabase.from("ml_events").insert({
      event_type: eventType,
      user_id: params.userId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error(`[mlEvents] failed to log ${eventType}:`, err);
  }
}

// search_anonymous / search_no_profile / search_profiled all describe the
// same "who is searching" split - shared here so search logging and any
// future caller classify it identically.
export function classifySearchEvent(
  hasUser: boolean,
  curlType: string | null | undefined
): Extract<MlEventType, "search_anonymous" | "search_no_profile" | "search_profiled"> {
  if (!hasUser) return "search_anonymous";
  return curlType ? "search_profiled" : "search_no_profile";
}
