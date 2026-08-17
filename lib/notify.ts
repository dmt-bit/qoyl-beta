import { getResend } from "@/lib/resend";

// Distinct from lib/adminNotify.ts (which sends to twinedaily@gmail.com
// for purchase events) -- this is the dedicated recipient requested for
// the new profile/purchase/comment notification triggers.
const NOTIFY_TO = "qoylnotifications@gmail.com";
const NOTIFY_FROM = "Qoyl <notifications@qoyl.live>";

export type SendNotificationResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no_api_key" }
  | {
      sent: false;
      reason: "api_error";
      error: { message: string; name: string; statusCode: number | null };
    }
  | { sent: false; reason: "threw"; error: unknown };

// Fire-and-forget in the sense that a failure here must never throw or
// block the caller's user-facing action -- but the result is returned
// (not swallowed) so callers can log/inspect it. Resend's SDK does NOT
// throw on API-level failures (invalid from address, quota limits,
// etc.) -- it resolves normally with { data: null, error: {...} }. An
// earlier version of this function only wrapped the call in try/catch,
// which only ever catches network/SDK-level throws, so real Resend API
// rejections were silently swallowed -- send() would resolve, no
// exception would fire, and nothing would be logged.
export async function sendNotificationEmail(
  subject: string,
  text: string
): Promise<SendNotificationResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY is not set; skipping notification:", subject);
    return { sent: false, reason: "no_api_key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: NOTIFY_FROM,
      to: NOTIFY_TO,
      subject,
      text,
    });

    console.log("[notify] send data:", JSON.stringify(data));
    console.log("[notify] send error:", JSON.stringify(error));

    if (error) {
      console.error("Resend API rejected notification email:", subject, error);
      console.log(
        "[notify] Resend rejection full error:",
        JSON.stringify(error, null, 2)
      );
      console.log(
        "[notify] Resend rejection data:",
        JSON.stringify(data, null, 2)
      );
      return { sent: false, reason: "api_error", error };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("Failed to send notification email:", subject, err);
    console.log("[notify] send threw:", JSON.stringify(err));
    return { sent: false, reason: "threw", error: err };
  }
}
