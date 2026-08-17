import { getResend } from "@/lib/resend";

const FROM_ADDRESS = "Qoyl <support@qoyl.live>";

// Only fires for new signups going forward -- there is no retroactive
// send for accounts created before this existed. A re-engagement email
// for those existing users should be sent manually via Resend's
// broadcast feature or Beehiiv, not backfilled through this function.
export type SendWelcomeEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no_api_key" }
  | {
      sent: false;
      reason: "api_error";
      error: { message: string; name: string; statusCode: number | null };
    }
  | { sent: false; reason: "threw"; error: unknown };

export async function sendWelcomeEmail(
  email: string
): Promise<SendWelcomeEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("[welcome-email] Resend not configured");
    return { sent: false, reason: "no_api_key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Welcome to Qoyl — here's what to do first",
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F5F0EA;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:white;">

  <div style="height:4px;background:linear-gradient(90deg,#9C7B5A,#C4A882,#9C7B5A);"></div>

  <div style="background:#1C1612;padding:24px 32px;">
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:600;color:#F5F0EA;">
      Q<span style="color:#C4A882;font-style:italic;">oyl</span>
    </div>
    <div style="font-size:11px;color:#9C7B5A;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">
      Hair Intelligence · Free
    </div>
  </div>

  <div style="padding:32px;">
    <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:300;color:#1C1612;margin:0 0 12px;">
      Welcome to Qoyl.
    </h1>
    <p style="font-size:14px;color:#5A4A3A;line-height:1.75;margin:0 0 20px;">
      You just joined a platform built on one idea: your hair deserves honest, science-backed intelligence — not marketing copy. Every product score you see is calculated from your specific curl type, porosity, scalp condition, and climate. No brand bias. No paid placements. Just the science.
    </p>

    <div style="background:#F5F0EA;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <div style="font-size:12px;font-weight:600;color:#9C7B5A;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Your next step</div>
      <p style="font-size:14px;color:#1C1612;line-height:1.65;margin:0 0 12px;">
        Build your free hair profile — it takes about 90 seconds. Tell us your curl type, porosity, scalp condition, and zip code, and every product search becomes personal to your hair.
      </p>
      <a href="https://qoyl.live/profile"
         style="display:inline-block;background:#1C1612;color:#F5F0EA;border-radius:8px;padding:12px 24px;font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.04em;">
        Build my hair profile →
      </a>
    </div>

    <div style="border-top:1px solid #EDE5D8;padding-top:20px;margin-top:4px;">
      <div style="font-size:12px;font-weight:600;color:#9C7B5A;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">What you can do on Qoyl</div>

      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
        <div style="width:6px;height:6px;border-radius:50%;background:#9C7B5A;flex-shrink:0;margin-top:6px;"></div>
        <div>
          <div style="font-size:13px;font-weight:500;color:#1C1612;">Score any hair product — free</div>
          <div style="font-size:12px;color:#7A6A5A;line-height:1.55;">Search any shampoo, conditioner, leave-in, or styler and get a compatibility score built from your profile. See exactly which ingredients work for your hair and which ones don't.</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
        <div style="width:6px;height:6px;border-radius:50%;background:#9C7B5A;flex-shrink:0;margin-top:6px;"></div>
        <div>
          <div style="font-size:13px;font-weight:500;color:#1C1612;">Read ingredient evaluations</div>
          <div style="font-size:12px;color:#7A6A5A;line-height:1.55;">Our feed breaks down common hair care ingredients — what they do, who they work for, and who should avoid them. Science without the jargon.</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
        <div style="width:6px;height:6px;border-radius:50%;background:#9C7B5A;flex-shrink:0;margin-top:6px;"></div>
        <div>
          <div style="font-size:13px;font-weight:500;color:#1C1612;">Get your personalized routine</div>
          <div style="font-size:12px;color:#7A6A5A;line-height:1.55;">Upgrade to a monthly routine subscription and get a 30-day wash day calendar, personalized steps, and a curated product list built for your specific hair profile.</div>
        </div>
      </div>
    </div>

    <div style="margin-top:24px;padding:16px 20px;background:#1C1612;border-radius:8px;">
      <p style="font-size:12px;color:#9C7B5A;line-height:1.65;margin:0;">
        Questions? Reply to this email or reach us at
        <a href="mailto:support@qoyl.live" style="color:#C4A882;">support@qoyl.live</a>.
        We read every message personally.
        <br/><br/>
        <span style="color:#5A4A3A;">— D, Founder of Qoyl</span>
      </p>
    </div>
  </div>

  <div style="background:#1C1612;padding:16px 32px;">
    <div style="font-size:10px;color:#5A4A3A;line-height:1.8;">
      You're receiving this because you created an account at qoyl.live<br/>
      <a href="https://qoyl.live/privacy" style="color:#9C7B5A;">Privacy Policy</a> ·
      <a href="https://qoyl.live/how-we-score" style="color:#9C7B5A;">How We Score</a>
    </div>
  </div>

</div>
</body>
</html>
      `,
    });

    if (error) {
      console.error("[welcome-email] Resend API rejected welcome email:", email, error);
      return { sent: false, reason: "api_error", error };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[welcome-email] Failed to send welcome email:", email, err);
    return { sent: false, reason: "threw", error: err };
  }
}
