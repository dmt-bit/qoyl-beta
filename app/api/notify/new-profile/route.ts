import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/notify";

// The profile form is a client component, so it can't import lib/notify.ts
// (and RESEND_API_KEY) directly -- this route is the server-side bridge,
// called fire-and-forget right after a successful hair_profiles insert.
export async function POST(request: Request) {
  const body = await request.json();
  const {
    curl_type,
    porosity,
    scalp_condition,
    strand_thickness,
    zip_code,
    profile_for,
    extensions,
    color_treated,
    budget,
  }: Record<string, string | null> = body;

  const val = (v: string | null | undefined) => v || "Not set";

  await sendNotificationEmail(
    `New Qoyl profile — ${val(curl_type)} ${val(porosity)}`,
    `New hair profile created on Qoyl.

Curl type: ${val(curl_type)}
Porosity: ${val(porosity)}
Scalp condition: ${val(scalp_condition)}
Strand thickness: ${val(strand_thickness)}
Zip code: ${val(zip_code)}
Profile for: ${val(profile_for)}
Extensions: ${val(extensions)}
Color treated: ${val(color_treated)}
Budget: ${val(budget)}
Created at: ${new Date().toISOString()}

View in Supabase: https://app.supabase.com/project/cqpxiassldkmusngqorx/editor`
  );

  return NextResponse.json({ ok: true });
}
