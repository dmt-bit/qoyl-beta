import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendNotificationEmail } from "@/lib/notify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server-side bridge for the newsletter form (client component, so it
// can't import lib/supabaseAdmin/lib/notify directly) - see
// supabase/create_newsletter_subscribers.sql (not yet run - DDL) and
// components/NewsletterSignup.tsx.
export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email ?? "").trim().toLowerCase();
  const source = typeof body.source === "string" ? body.source : null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("newsletter_subscribers")
    .upsert({ email, source }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("[newsletter/subscribe] insert failed:", error.message);
    return NextResponse.json({ error: "Couldn't subscribe right now. Try again." }, { status: 500 });
  }

  sendNotificationEmail("New newsletter subscriber", `${email} subscribed via ${source ?? "unknown source"}.`).catch(
    (err) => console.error("[newsletter/subscribe] notification email failed:", err)
  );

  return NextResponse.json({ ok: true });
}
