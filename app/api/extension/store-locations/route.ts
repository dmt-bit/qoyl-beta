import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/extension/store-locations
// Called by the Qoyl Chrome extension geofencing alarm to get the
// coordinates of nearby supported retailer locations.
//
// In production this should be backed by a `retailer_locations` table in
// Supabase (populated via a separate data import job).  While that table
// is being populated, this endpoint falls back to a hardcoded seed of
// well-known flagship/major-metro store coordinates so the geofencing
// feature works from day one.
//
// Auth: Bearer token required (keeps the location data behind auth so we
//       don't expose a free geocoded store directory endpoint).
//
// Returns: Array<{ chain: string, lat: number, lng: number, name?: string }>

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Seed data: major-metro flagship locations for each supported chain.
// Format: { chain, name, lat, lng }
// chain matches RETAILER_CHAINS[].key in retailers-geo.js
const SEED_LOCATIONS: Array<{ chain: string; name: string; lat: number; lng: number }> = [
  // Ulta Beauty
  { chain: "ulta", name: "Ulta — Chicago Loop", lat: 41.8827, lng: -87.6306 },
  { chain: "ulta", name: "Ulta — Atlanta Buckhead", lat: 33.8490, lng: -84.3765 },
  { chain: "ulta", name: "Ulta — Houston Galleria", lat: 29.7360, lng: -95.4674 },
  { chain: "ulta", name: "Ulta — LA Westwood", lat: 34.0631, lng: -118.4480 },
  { chain: "ulta", name: "Ulta — NYC Herald Square", lat: 40.7503, lng: -73.9877 },
  { chain: "ulta", name: "Ulta — Miami Brickell", lat: 25.7617, lng: -80.1918 },
  { chain: "ulta", name: "Ulta — Dallas Mockingbird", lat: 32.8378, lng: -96.7822 },
  { chain: "ulta", name: "Ulta — DC Georgetown", lat: 38.9057, lng: -77.0640 },
  { chain: "ulta", name: "Ulta — Philadelphia Center City", lat: 39.9526, lng: -75.1652 },
  { chain: "ulta", name: "Ulta — Charlotte Southpark", lat: 35.1495, lng: -80.8549 },
  { chain: "ulta", name: "Ulta — Oakland Emeryville", lat: 37.8349, lng: -122.2896 },
  { chain: "ulta", name: "Ulta — Baltimore Inner Harbor", lat: 39.2904, lng: -76.6122 },
  // Sally Beauty
  { chain: "sally", name: "Sally Beauty — Chicago", lat: 41.8785, lng: -87.6358 },
  { chain: "sally", name: "Sally Beauty — Atlanta", lat: 33.7490, lng: -84.3880 },
  { chain: "sally", name: "Sally Beauty — Houston", lat: 29.7604, lng: -95.3698 },
  { chain: "sally", name: "Sally Beauty — LA", lat: 34.0522, lng: -118.2437 },
  { chain: "sally", name: "Sally Beauty — NYC Brooklyn", lat: 40.6782, lng: -73.9442 },
  { chain: "sally", name: "Sally Beauty — Miami", lat: 25.7742, lng: -80.1937 },
  { chain: "sally", name: "Sally Beauty — Dallas", lat: 32.7767, lng: -96.7970 },
  { chain: "sally", name: "Sally Beauty — DC", lat: 38.8951, lng: -77.0364 },
  { chain: "sally", name: "Sally Beauty — Charlotte", lat: 35.2271, lng: -80.8431 },
  // Target
  { chain: "target", name: "Target — Chicago State St", lat: 41.8781, lng: -87.6298 },
  { chain: "target", name: "Target — Atlanta Midtown", lat: 33.7814, lng: -84.3831 },
  { chain: "target", name: "Target — Houston River Oaks", lat: 29.7370, lng: -95.4283 },
  { chain: "target", name: "Target — LA Hollywood", lat: 34.0928, lng: -118.3287 },
  { chain: "target", name: "Target — NYC East Harlem", lat: 40.8008, lng: -73.9389 },
  { chain: "target", name: "Target — Miami Doral", lat: 25.8135, lng: -80.3350 },
  { chain: "target", name: "Target — Dallas Downtown", lat: 32.7814, lng: -96.8008 },
  { chain: "target", name: "Target — DC Columbia Heights", lat: 38.9284, lng: -77.0329 },
  { chain: "target", name: "Target — Philadelphia", lat: 39.9526, lng: -75.1652 },
  // Walmart
  { chain: "walmart", name: "Walmart — Chicago", lat: 41.8600, lng: -87.7230 },
  { chain: "walmart", name: "Walmart — Atlanta", lat: 33.7290, lng: -84.4090 },
  { chain: "walmart", name: "Walmart — Houston", lat: 29.7260, lng: -95.5110 },
  { chain: "walmart", name: "Walmart — LA", lat: 34.0380, lng: -118.2730 },
  { chain: "walmart", name: "Walmart — Miami", lat: 25.7480, lng: -80.2750 },
  { chain: "walmart", name: "Walmart — Dallas", lat: 32.8010, lng: -96.7860 },
  // CVS
  { chain: "cvs", name: "CVS — Chicago Michigan Ave", lat: 41.8880, lng: -87.6240 },
  { chain: "cvs", name: "CVS — Atlanta Peachtree", lat: 33.7984, lng: -84.3879 },
  { chain: "cvs", name: "CVS — Houston Montrose", lat: 29.7399, lng: -95.3909 },
  { chain: "cvs", name: "CVS — LA Wilshire", lat: 34.0613, lng: -118.3085 },
  { chain: "cvs", name: "CVS — NYC 42nd St", lat: 40.7549, lng: -73.9840 },
  { chain: "cvs", name: "CVS — Miami Beach", lat: 25.7903, lng: -80.1300 },
  { chain: "cvs", name: "CVS — DC 14th St", lat: 38.9094, lng: -77.0319 },
  // Walgreens
  { chain: "walgreens", name: "Walgreens — Chicago State St", lat: 41.8827, lng: -87.6277 },
  { chain: "walgreens", name: "Walgreens — Atlanta", lat: 33.7843, lng: -84.3822 },
  { chain: "walgreens", name: "Walgreens — Houston", lat: 29.7449, lng: -95.3855 },
  { chain: "walgreens", name: "Walgreens — LA Sunset", lat: 34.0988, lng: -118.3290 },
  { chain: "walgreens", name: "Walgreens — NYC Times Square", lat: 40.7589, lng: -73.9851 },
  { chain: "walgreens", name: "Walgreens — Miami Coral Gables", lat: 25.7217, lng: -80.2684 },
  { chain: "walgreens", name: "Walgreens — DC Dupont Circle", lat: 38.9096, lng: -77.0434 },
];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  // ── Try DB first, fall back to seed ───────────────────────────────────────
  const { data: dbLocations } = await admin
    .from("retailer_locations")
    .select("chain, name, lat, lng")
    .limit(1000);

  const locations =
    dbLocations && dbLocations.length > 0 ? dbLocations : SEED_LOCATIONS;

  return NextResponse.json(locations, { status: 200, headers: CORS_HEADERS });
}
