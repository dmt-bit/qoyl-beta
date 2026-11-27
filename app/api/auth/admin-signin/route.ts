import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Sign any user in by email instantly — no email sent, no magic link to click.
// Uses the Supabase service-role key to generate a confirmed session token
// server-side and returns it directly to the client.
//
// Body: { email: string, redirectTo?: string }
//   redirectTo — where Supabase redirects after the verify step.
//   Defaults to the site root. Pass /auth/extension-callback when
//   signing in from the Chrome extension so the session gets relayed.

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email: string | undefined = body?.email?.trim().toLowerCase();
  const redirectTo: string | undefined = body?.redirectTo;

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (request.headers.get("origin") ?? "");

  // If a specific redirectTo was requested, resolve it against the site URL.
  // Only allow relative paths (starts with /) to prevent open redirects.
  const finalRedirect =
    redirectTo && redirectTo.startsWith("/")
      ? `${siteUrl}${redirectTo}`
      : siteUrl;

  // Generate a confirmed magic link server-side.
  // This creates a valid session token without sending any email.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: finalRedirect,
    },
  });

  if (error || !data?.properties?.hashed_token) {
    console.error("[admin-signin] generateLink failed:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Failed to sign in." },
      { status: 500 }
    );
  }

  // Return the confirm URL — the client navigates to it to establish the session.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const confirmUrl =
    `${supabaseUrl}/auth/v1/verify?token=${data.properties.hashed_token}` +
    `&type=magiclink&redirect_to=${encodeURIComponent(finalRedirect)}`;

  return NextResponse.json({ confirmUrl });
}
