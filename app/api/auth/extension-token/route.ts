import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

// Extension-specific sign-in endpoint.
// Returns an access_token and refresh_token directly so the Chrome extension
// can store the session in chrome.storage.local without opening any browser tab
// or following a redirect.
//
// Body: { email: string }
// Response: { access_token, refresh_token, user: { id, email } }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email: string | undefined = body?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Step 1: generate a confirmed magic-link token (no email sent).
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[extension-token] generateLink failed:", linkError?.message);
    return NextResponse.json(
      { error: linkError?.message ?? "Failed to generate token." },
      { status: 500 }
    );
  }

  const hashedToken = linkData.properties.hashed_token;

  // Step 2: exchange the hashed token for a real session using verifyOtp.
  // We use a fresh anon client so we get back a user session, not a service-role session.
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: sessionData, error: sessionError } =
    await anonClient.auth.verifyOtp({
      token_hash: hashedToken,
      type: "magiclink",
    });

  if (sessionError || !sessionData?.session?.access_token) {
    console.error("[extension-token] verifyOtp failed:", sessionError?.message);
    return NextResponse.json(
      { error: sessionError?.message ?? "Failed to exchange token." },
      { status: 500 }
    );
  }

  const { session } = sessionData;

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: {
      id: session.user?.id,
      email: session.user?.email ?? email,
    },
  });
}
