import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/notify";

// /travel is a client component, so it can't import lib/notify.ts (and
// RESEND_API_KEY) directly -- this route is the server-side bridge,
// called fire-and-forget right after a successful travel_kits insert
// (status 'pending_payment'), before the user is redirected to Stripe.
export async function POST(request: Request) {
  console.log("[notify/new-travel-survey] route hit");

  const body = await request.json();
  const {
    user_id,
    destination,
    departure_date,
    return_date,
    climate,
    swimming,
    protective_style,
    hair_priority,
  }: Record<string, string | null> = body;

  console.log("[notify/new-travel-survey] request body:", JSON.stringify(body));

  const notifyResult = await sendNotificationEmail(
    `New travel kit survey submitted — ${destination}`,
    `New travel kit survey submitted on Qoyl.

User ID: ${user_id}
Destination: ${destination}
Departure: ${departure_date ?? "Not set"}
Return: ${return_date ?? "Not set"}
Climate: ${climate ?? "Not set"}
Swimming: ${swimming ?? "Not set"}
Protective style: ${protective_style ?? "Not set"}
Hair priority: ${hair_priority ?? "Not set"}
Submitted at: ${new Date().toISOString()}

Payment not yet completed — user is being directed to Stripe now.`
  );

  console.log(
    "[notify/new-travel-survey] sendNotificationEmail result:",
    notifyResult
  );

  return NextResponse.json({ ok: true });
}
