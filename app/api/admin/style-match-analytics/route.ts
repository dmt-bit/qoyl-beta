import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { lookupCityState } from "@/lib/zipLookup";

const DAY_MS = 24 * 60 * 60 * 1000;
// Caps how far back this pulls rows from - keeps the query and the zip
// code -> city resolution below (one external API call per distinct
// zip, see lib/zipLookup.ts) bounded for an admin page that's expected
// to load in a few seconds, not paginate years of history.
const LOOKBACK_DAYS = 90;

type StyleMatchRow = {
  id: string;
  user_id: string;
  detected_style: string | null;
  detected_details: { fake_hair_type?: string | null; requires_fake_hair?: boolean } | null;
  followed_through: boolean;
  created_at: string;
};

function rankCounts(counts: Map<string, number>, limit: number): { label: string; count: number }[] {
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// This is Qoyl's B2B pitch data: which styles are trending, what fake
// hair users actually need, and which cities have demand - the same
// shape a brand or stylist account tier would eventually see a slice of.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - LOOKBACK_DAYS * DAY_MS).toISOString();

  const { data: matches, error } = await admin
    .from("style_matches")
    .select("id, user_id, detected_style, detected_details, followed_through, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (matches ?? []) as StyleMatchRow[];

  const now = Date.now();
  const weekStart = now - 7 * DAY_MS;
  const monthStart = now - 30 * DAY_MS;

  const totalThisWeek = rows.filter((r) => new Date(r.created_at).getTime() >= weekStart).length;
  const totalThisMonth = rows.filter((r) => new Date(r.created_at).getTime() >= monthStart).length;

  const styleCounts = new Map<string, number>();
  const fakeHairCounts = new Map<string, number>();
  let followedThroughCount = 0;

  for (const row of rows) {
    const styleName = row.detected_style || "Unknown style";
    styleCounts.set(styleName, (styleCounts.get(styleName) ?? 0) + 1);

    if (row.detected_details?.requires_fake_hair) {
      const fakeHairType = row.detected_details.fake_hair_type || styleName;
      fakeHairCounts.set(fakeHairType, (fakeHairCounts.get(fakeHairType) ?? 0) + 1);
    }

    if (row.followed_through) followedThroughCount += 1;
  }

  const conversionRate = rows.length > 0 ? Math.round((followedThroughCount / rows.length) * 100) : 0;

  // City resolution: match -> user_id -> hair_profiles.zip_code -> city,
  // via the same zippopotam.us lookup used elsewhere (e.g. Style Match's
  // stylist tab). Zip codes are deduped before hitting the external API
  // so a popular zip is only looked up once regardless of how many
  // matches came from it.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const zipByUserId = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("hair_profiles")
      .select("user_id, zip_code")
      .in("user_id", userIds);

    for (const profile of profiles ?? []) {
      if (profile.zip_code) zipByUserId.set(profile.user_id, profile.zip_code);
    }
  }

  const distinctZips = Array.from(new Set(Array.from(zipByUserId.values())));
  const cityByZip = new Map<string, string>();
  await Promise.all(
    distinctZips.map(async (zip) => {
      const cityState = await lookupCityState(zip);
      if (cityState) cityByZip.set(zip, `${cityState.city}, ${cityState.stateAbbreviation}`);
    })
  );

  const cityCounts = new Map<string, number>();
  for (const row of rows) {
    const zip = zipByUserId.get(row.user_id);
    const city = zip ? cityByZip.get(zip) : null;
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }

  return NextResponse.json({
    totalThisWeek,
    totalThisMonth,
    mostMatchedStyles: rankCounts(styleCounts, 10),
    fakeHairTypes: rankCounts(fakeHairCounts, 10),
    citiesWithMostMatches: rankCounts(cityCounts, 10),
    conversion: {
      rate: conversionRate,
      followedThroughCount,
      totalCount: rows.length,
    },
  });
}
