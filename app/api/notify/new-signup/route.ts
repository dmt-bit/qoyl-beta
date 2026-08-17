import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/sendWelcomeEmail";
import { sendNotificationEmail } from "@/lib/notify";

// /auth is a client component, so it can't import lib/sendWelcomeEmail.ts
// or lib/notify.ts (and RESEND_API_KEY) directly -- this route is the
// server-side bridge, called fire-and-forget right after a successful
// supabase.auth.signUp() with no error.
export async function POST(request: Request) {
  console.log("[notify/new-signup] route hit");

  const body = await request.json();
  const { email }: { email?: string } = body;

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  console.log("[notify/new-signup] request body:", JSON.stringify(body));

  const [welcomeResult, notifyResult] = await Promise.all([
    sendWelcomeEmail(email),
    sendNotificationEmail("New Qoyl signup", `New user signed up: ${email}`),
  ]);

  console.log("[notify/new-signup] sendWelcomeEmail result:", welcomeResult);
  console.log("[notify/new-signup] sendNotificationEmail result:", notifyResult);

  return NextResponse.json({ ok: true });
}
