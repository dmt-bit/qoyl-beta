import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAdminNotification } from "@/lib/adminNotify";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    email,
    businessName,
    instagramHandle,
  }: {
    name?: string;
    email?: string;
    businessName?: string;
    instagramHandle?: string;
  } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("event_rsvps").insert({
    event_slug: "find-your-stylist",
    role: "stylist",
    name,
    email,
    business_name: businessName || null,
    instagram_handle: instagramHandle || null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await sendAdminNotification(
    `Stylist RSVP - Find Your Stylist`,
    `A stylist RSVP'd to attend Find Your Stylist for free.

Name: ${name}
Email: ${email}
Salon/business: ${businessName || "Not provided"}
Instagram: ${instagramHandle || "Not provided"}

Submitted at: ${new Date().toISOString()}`
  );

  return NextResponse.json({ ok: true });
}
