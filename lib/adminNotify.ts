import { getResend } from "@/lib/resend";

const ADMIN_EMAIL = "hey@qoyl.live";
const NOTIFY_FROM = "Qoyl <hey@qoyl.live>";

export async function sendAdminNotification(
  subject: string,
  text: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "RESEND_API_KEY is not set; skipping admin notification:",
      subject
    );
    return;
  }

  try {
    await resend.emails.send({
      from: NOTIFY_FROM,
      to: ADMIN_EMAIL,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send admin notification:", subject, err);
  }
}
