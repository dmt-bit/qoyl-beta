import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Admin emails that can bypass email confirmation.
// These users get an auto-confirmed magic link without waiting for email.
const BYPASS_EMAILS = new Set([
  "qoyl.live@gmail.com",
  "hey@qoyl.live",
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email: string | undefined = body?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  if (!BYPASS_EMAILS.has(email)) {
    // Not an admin bypass email — treat as a normal OTP flow
    return NextResponse.json({ bypass: false });
  }

  const admin = getSupabaseAdmin();

  // Generate a magic link server-side using the service role.
  // This creates a valid confirmed session token without sending an email.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (request.headers.get("origin") ?? "");

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: siteUrl,
    },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("[admin-signin] generateLink failed:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Failed to generate sign-in link." },
      { status: 500 }
    );
  }

  // The hashed_token is the token component of the confirmation URL.
  // The client will navigate to Supabase's auth/confirm endpoint with it.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const confirmUrl =
    `${supabaseUrl}/auth/v1/verify?token=${data.properties.hashed_token}` +
    `&type=magiclink&redirect_to=${encodeURIComponent(siteUrl)}`;

  return NextResponse.json({ bypass: true, confirmUrl });
}
