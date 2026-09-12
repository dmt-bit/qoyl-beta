import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { lookupCityState } from "@/lib/zipLookup";
import type { StyleShoppingList } from "@/lib/styleShoppingList";
import { HAIR_ADDITION_PREFERENCE_LABELS, type HairAdditionPreference } from "@/lib/hairAdditionPreference";

// Same CHECK-constraint values as components/HairJourneySection.tsx -
// used only to label the client's most recent hair photo as a
// best-effort "current length" proxy, since hair_profiles itself has no
// length field at all.
const HAIR_LENGTH_LABELS: Record<string, string> = {
  twa: "TWA",
  short: "Short",
  medium: "Medium",
  long: "Long",
  very_long: "Very Long",
};

export type DetectedStyleDetails = {
  style_name?: string;
  style_description?: string;
  hair_length?: string;
  requires_fake_hair?: boolean;
  fake_hair_type?: string | null;
  accessories_visible?: string[];
  estimated_time?: string;
  difficulty?: string;
  compatible_hair_types?: string[];
  image_url?: string | null;
};

export type YouTubeVideoSummary = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export type StructuredService = {
  name: string;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  duration_max: number | null;
  deposit_required: boolean;
  deposit_amount: number | null;
  hair_types_served?: string[];
  // Optional - the qoyl-business stylist form (a separate codebase, not
  // this repo) doesn't collect this yet, so it's absent on every real
  // service today. Interpreted here as: which hair_addition_preference
  // values ("human_hair_only", "synthetic_only", etc. - see
  // lib/hairAdditionPreference.ts) this specific service is offered for.
  // The "Human hair installs only" filter (item 8) reads this field when
  // present and simply shows nothing for a stylist who hasn't set it.
  hair_addition_types?: string[];
  notes: string | null;
};

export type StyleMatchSummaryData = {
  id: string;
  createdAt: string;
  detectedStyle: string;
  detectedDetails: DetectedStyleDetails;
  survey: {
    colorMatch: boolean;
    lengthDifference: string | null;
    involvesExtensions: string | null;
    hairAdditionPreference: string | null;
    hairAdditionPreferenceLabel: string | null;
    translatedForHairType: boolean;
  };
  clientProfile: {
    curlType: string | null;
    porosity: string | null;
    scalpCondition: string | null;
    currentLengthLabel: string | null;
    cityState: string | null;
    zipCode: string | null;
    waterHardness: string | null;
    climate: string | null;
  };
  tutorials: YouTubeVideoSummary[];
  shoppingList: StyleShoppingList | null;
  matchedStylist: {
    displayName: string;
    salonName: string | null;
    city: string | null;
    bookingUrl: string | null;
    service: StructuredService | null;
  } | null;
  marketEstimate: {
    styleName: string;
    priceMin: number;
    priceMax: number;
    durationMin: number;
    durationMax: number;
    priceNotes: string | null;
    factors: string[];
  } | null;
  notes: string | null;
};

// Matches a detected style name against a stylist's services_structured
// array (see supabase/style_match_summary.sql's comment and the request's
// item 4 - the expected shape this looks for once qoyl-business's
// stylist form actually writes it). Case-insensitive, either direction
// substring match so "Knotless Braids" matches a service literally named
// "Knotless Braids" as well as one named just "Braids".
export function findMatchingService(
  services: unknown,
  styleName: string
): StructuredService | null {
  if (!Array.isArray(services)) return null;
  const target = styleName.trim().toLowerCase();

  for (const raw of services) {
    if (!raw || typeof raw !== "object") continue;
    const svc = raw as Partial<StructuredService>;
    if (typeof svc.name !== "string") continue;
    const name = svc.name.trim().toLowerCase();
    if (name === target || name.includes(target) || target.includes(name)) {
      return {
        name: svc.name,
        price_min: svc.price_min ?? null,
        price_max: svc.price_max ?? null,
        duration_min: svc.duration_min ?? null,
        duration_max: svc.duration_max ?? null,
        deposit_required: Boolean(svc.deposit_required),
        deposit_amount: svc.deposit_amount ?? null,
        hair_types_served: svc.hair_types_served ?? [],
        hair_addition_types: svc.hair_addition_types ?? [],
        notes: svc.notes ?? null,
      };
    }
  }
  return null;
}

export type MarketEstimate = NonNullable<StyleMatchSummaryData["marketEstimate"]>;

// The style_price_estimates fallback (item 6's "no stylist matched"
// case) - shared by the summary assembly below and
// app/api/style-match/price-estimate/route.ts, used directly by the
// Book a Stylist tab when zero stylists come back for the user's city.
export async function getMarketEstimate(styleName: string): Promise<MarketEstimate | null> {
  if (!styleName) return null;
  const { data: estimate } = await getSupabaseAdmin()
    .from("style_price_estimates")
    .select(
      "style_name, price_min, price_max, duration_hours_min, duration_hours_max, price_notes, factors_affecting_price"
    )
    .ilike("style_name", styleName)
    .maybeSingle();

  if (!estimate) return null;
  return {
    styleName: estimate.style_name,
    priceMin: estimate.price_min,
    priceMax: estimate.price_max,
    durationMin: estimate.duration_hours_min,
    durationMax: estimate.duration_hours_max,
    priceNotes: estimate.price_notes,
    factors: estimate.factors_affecting_price ?? [],
  };
}

// Assembles everything the public summary page (and its "generate"
// notification) needs from a style_matches row - the single source of
// truth for both app/api/style-match/summary/[id]/route.ts (public GET)
// and the notification email's subject/body.
export async function buildStyleMatchSummary(
  matchId: string
): Promise<StyleMatchSummaryData | null> {
  const admin = getSupabaseAdmin();

  const { data: match, error } = await admin
    .from("style_matches")
    .select(
      "id, user_id, created_at, detected_style, detected_details, tutorials, shopping_list, stylist_id, color_match, length_difference, involves_extensions, hair_addition_preference, translated_for_hair_type, notes"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error || !match) return null;

  const [{ data: profile }, { data: recentPhoto }] = await Promise.all([
    admin
      .from("hair_profiles")
      .select("curl_type, porosity, scalp_condition, zip_code, water_hardness, climate")
      .eq("user_id", match.user_id)
      .maybeSingle(),
    admin
      .from("hair_photos")
      .select("hair_length")
      .eq("user_id", match.user_id)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cityState = profile?.zip_code ? await lookupCityState(profile.zip_code) : null;

  let matchedStylist: StyleMatchSummaryData["matchedStylist"] = null;
  if (match.stylist_id) {
    const { data: stylist } = await admin
      .from("stylist_accounts")
      .select("display_name, salon_name, city, booking_url, services_structured")
      .eq("id", match.stylist_id)
      .maybeSingle();
    if (stylist) {
      matchedStylist = {
        displayName: stylist.display_name,
        salonName: stylist.salon_name,
        city: stylist.city,
        bookingUrl: stylist.booking_url,
        service: findMatchingService(stylist.services_structured, match.detected_style ?? ""),
      };
    }
  }

  // Shown either as the sole estimate (no stylist matched) or as a
  // secondary reference when the matched stylist has no structured
  // pricing for this specific style yet.
  const marketEstimate = matchedStylist?.service
    ? null
    : await getMarketEstimate(match.detected_style ?? "");

  const detectedDetails = (match.detected_details ?? {}) as DetectedStyleDetails;
  const tutorialsJson = (match.tutorials ?? {}) as { youtube?: YouTubeVideoSummary[] };

  return {
    id: match.id,
    createdAt: match.created_at,
    detectedStyle: match.detected_style ?? detectedDetails.style_name ?? "Your style",
    detectedDetails,
    survey: {
      colorMatch: Boolean(match.color_match),
      lengthDifference: match.length_difference,
      involvesExtensions: match.involves_extensions,
      hairAdditionPreference: match.hair_addition_preference,
      hairAdditionPreferenceLabel: match.hair_addition_preference
        ? HAIR_ADDITION_PREFERENCE_LABELS[match.hair_addition_preference as HairAdditionPreference] ?? null
        : null,
      translatedForHairType: Boolean(match.translated_for_hair_type),
    },
    clientProfile: {
      curlType: profile?.curl_type ?? null,
      porosity: profile?.porosity ?? null,
      scalpCondition: profile?.scalp_condition ?? null,
      currentLengthLabel: recentPhoto?.hair_length
        ? HAIR_LENGTH_LABELS[recentPhoto.hair_length] ?? null
        : null,
      cityState: cityState ? `${cityState.city}, ${cityState.stateAbbreviation}` : null,
      zipCode: profile?.zip_code ?? null,
      waterHardness: profile?.water_hardness ?? null,
      climate: profile?.climate ?? null,
    },
    tutorials: (tutorialsJson.youtube ?? []).slice(0, 3),
    shoppingList: (match.shopping_list as StyleShoppingList | null) ?? null,
    matchedStylist,
    marketEstimate,
    notes: match.notes ?? null,
  };
}
