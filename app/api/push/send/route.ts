import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPushToUser, sendPushToUsers, broadcastPush, PushPayload } from "@/lib/webPush";

// POST /api/push/send
// Internal route for sending web push notifications from the server
// (admin dashboard, cron jobs, etc.)
//
// Body:
//   {
//     target: "user" | "users" | "broadcast"
//     userId?: string        // when target = "user"
//     userIds?: string[]     // when target = "users"
//     payload: PushPayload   // { title, body, url?, icon?, tag?, data? }
//   }
//
// Auth: requires PUSH_SEND_SECRET header or admin session.
// The PUSH_SEND_SECRET is a server-only secret set in Vercel env vars.
// For admin-panel sends, the admin's Supabase session is checked instead.

export async function POST(request: Request) {
  // ── Auth: either server secret or admin user ────────────────────────────────
  const secret = request.headers.get("x-push-secret");
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  const pushSecret = process.env.PUSH_SEND_SECRET;
  let authorized = false;

  if (pushSecret && secret === pushSecret) {
    authorized = true;
  } else if (token) {
    const admin = getSupabaseAdmin();
    const { data: { user } } = await admin.auth.getUser(token);
    if (user) {
      // Check the user is an admin.
      const { data: profile } = await admin
        .from("hair_profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.is_admin) authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { target, userId, userIds, payload } = body as {
    target: string;
    userId?: string;
    userIds?: string[];
    payload: PushPayload;
  };

  if (!payload?.title || !payload?.body) {
    return NextResponse.json({ error: "payload.title and payload.body are required." }, { status: 400 });
  }

  let result: { sent: number; failed: number };

  switch (target) {
    case "user":
      if (!userId) return NextResponse.json({ error: "userId required for target=user." }, { status: 400 });
      result = await sendPushToUser(userId, payload);
      break;

    case "users":
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: "userIds required for target=users." }, { status: 400 });
      }
      result = await sendPushToUsers(userIds, payload);
      break;

    case "broadcast":
      result = await broadcastPush(payload);
      break;

    default:
      return NextResponse.json({ error: "target must be 'user', 'users', or 'broadcast'." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...result });
}
