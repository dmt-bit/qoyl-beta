import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// POST /api/push/subscribe   — save a PushSubscription for the signed-in user
// DELETE /api/push/subscribe — remove it (user opted out or uninstalled)
//
// Body (POST):  { subscription: PushSubscriptionJSON }
// Body (DELETE):{ endpoint: string }
// Auth: Bearer token

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://qoyl.live",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function getUser(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await getSupabaseAdmin().auth.getUser(token);
  return user ?? null;
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const body = await request.json().catch(() => ({}));
  const sub = body.subscription as PushSubscriptionJSON | undefined;

  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription object." }, { status: 400, headers: CORS_HEADERS });
  }

  const admin = getSupabaseAdmin();

  // Upsert on endpoint — one row per browser/device.
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("[push/subscribe] upsert failed:", error.message);
    return NextResponse.json({ error: "Failed to save subscription." }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}

export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required." }, { status: 400, headers: CORS_HEADERS });
  }

  await getSupabaseAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
