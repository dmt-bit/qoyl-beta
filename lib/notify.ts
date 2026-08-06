import { getResend } from "@/lib/resend";

// Distinct from lib/adminNotify.ts (which sends to twinedaily@gmail.com
// for purchase events) -- this is the dedicated recipient requested for
// the new profile/purchase/comment notification triggers.
const NOTIFY_TO = "qoylnotifications@gmail.com";
const NOTIFY_FROM = "Qoyl <onboarding@resend.dev>";

// Always fire-and-forget: never throws, never surfaces to the user. Every
// call site should treat this as best-effort and not await it in a way
// that blocks the user-facing action.
export async function sendNotificationEmail(
  subject: string,
  text: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY is not set; skipping notification:", subject);
    return;
  }

  try {
    await resend.emails.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send notification email:", subject, err);
  }
}
