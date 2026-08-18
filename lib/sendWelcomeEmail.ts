import { getResend } from "@/lib/resend";

const FROM_ADDRESS = "Qoyl <hey@qoyl.live>";

// TEMPORARY: also sends a copy of the welcome email to
// qoylnotifications@gmail.com (subject prefixed "PREVIEW:") so it can be
// previewed in a real inbox. Remove PREVIEW_TO and the second
// resend.emails.send() call below once the design is approved.
const PREVIEW_TO = "qoylnotifications@gmail.com";

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Welcome to Qoyl</title>
</head>
<body style="margin:0;padding:0;background:#0E0C0A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#0E0C0A;">
  <div style="position:relative;width:100%;overflow:hidden;">
    <img src="https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-svet-svet-2156448907-35140064" alt="Natural hair" width="560" style="width:100%;height:380px;object-fit:cover;object-position:center 20%;display:block;"/>
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(14,12,10,0.35) 0%, rgba(14,12,10,0.55) 50%, rgba(14,12,10,0.92) 100%);"></div>
    <div style="position:absolute;top:28px;left:0;right:0;text-align:center;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#F5F0EA;letter-spacing:2px;">Q</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#C4A882;font-style:italic;letter-spacing:2px;">oyl</span>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:0 32px 32px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;color:#F5F0EA;margin:0;line-height:1.2;letter-spacing:0.3px;text-align:center;">
        You are in.<br/>We are glad you are here.
      </h1>
    </div>
  </div>
  <div style="padding:40px 32px 0;">
    <p style="font-size:14px;color:#C4A882;line-height:1.9;margin:0 0 20px;font-weight:300;letter-spacing:0.2px;">
      Qoyl exists because hair care has always been personal and the information available to consumers has never matched that reality. We built this platform with one genuine goal: to create a community where people can truly understand what their hair needs, make informed decisions, and stop spending money on products that were never right for them.
    </p>
    <p style="font-size:14px;color:#7A6A5A;line-height:1.9;margin:0 0 36px;font-weight:300;letter-spacing:0.2px;">
      We want Qoyl to be the reference point for everything hair. Ingredient science, product evaluations, honest comparisons, and a growing community of people learning together. You are part of that from day one.
    </p>
    <div style="height:1px;background:#1C1612;margin:0 0 36px;"></div>
    <div style="margin:0 0 36px;">
      <div style="font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#9C7B5A;margin-bottom:14px;">Start here</div>
      <p style="font-size:14px;color:#C4A882;line-height:1.85;margin:0 0 22px;font-weight:300;">
        Build your free hair profile. It takes about 90 seconds. Tell us your curl type, porosity, scalp condition, and zip code. After that every product search on Qoyl returns a score built specifically for your hair.
      </p>
      <a href="https://qoyl.live/profile" style="display:inline-block;background:#9C7B5A;color:#F5F0EA;border-radius:4px;padding:13px 32px;font-size:12px;font-weight:500;text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;">
        Build my profile
      </a>
    </div>
    <div style="height:1px;background:#1C1612;margin:0 0 36px;"></div>
    <div style="font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#9C7B5A;margin-bottom:24px;">What Qoyl gives you</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 36px;">
      <tr><td style="padding:0 0 20px;">
        <div style="font-size:12px;font-weight:600;color:#F5F0EA;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Personalized scores</div>
        <div style="font-size:13px;color:#5A4A3A;line-height:1.75;font-weight:300;">Search any product. Get a compatibility score based on your curl type, porosity, scalp, and climate. Not someone else's hair.</div>
      </td></tr>
      <tr><td style="padding:0 0 20px;">
        <div style="font-size:12px;font-weight:600;color:#F5F0EA;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Ingredient intelligence</div>
        <div style="font-size:13px;color:#5A4A3A;line-height:1.75;font-weight:300;">Honest breakdowns of what is actually in your products, what each ingredient does, and who it works for.</div>
      </td></tr>
      <tr><td style="padding:0 0 0;">
        <div style="font-size:12px;font-weight:600;color:#F5F0EA;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">A community built on honesty</div>
        <div style="font-size:13px;color:#5A4A3A;line-height:1.75;font-weight:300;">No brand bias. No paid placements. No sponsored scores. Just people learning what their hair actually needs.</div>
      </td></tr>
    </table>
  </div>
  <div style="width:100%;overflow:hidden;">
    <img src="https://res.cloudinary.com/kumxntij/image/upload/f_auto,q_auto/pexels-pedrofurtadoo-29096365" alt="Hair care" width="560" style="width:100%;height:260px;object-fit:cover;object-position:center 30%;display:block;"/>
  </div>
  <div style="background:#080604;padding:28px 32px;">
    <p style="font-size:12px;color:#7A6A5A;line-height:1.85;margin:0 0 6px;font-weight:300;">Questions or thoughts? Reply directly to this email. We read everything.</p>
    <p style="font-size:12px;color:#9C7B5A;margin:0 0 20px;font-style:italic;">The Qoyl Team</p>
    <div style="height:1px;background:#1C1612;margin:0 0 16px;"></div>
    <div style="font-size:10px;color:#2C2420;line-height:1.8;">
      You are receiving this because you created an account at qoyl.live<br/>
      <a href="https://qoyl.live/privacy" style="color:#3A2E28;text-decoration:none;">Privacy Policy</a>
      &nbsp;&nbsp;
      <a href="https://qoyl.live/how-we-score" style="color:#3A2E28;text-decoration:none;">How We Score</a>
    </div>
  </div>
</div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "Welcome to Qoyl",
      html,
    });

    // TEMPORARY preview send -- see PREVIEW_TO comment above. A failure
    // here must never affect the real welcome email's result, so it's
    // logged but not folded into the function's return value.
    const previewResult = await resend.emails.send({
      from: FROM_ADDRESS,
      to: PREVIEW_TO,
      subject: "PREVIEW: Welcome email",
      html,
    });
    if (previewResult.error) {
      console.error(
        "[welcome-email] PREVIEW send failed:",
        previewResult.error
      );
    }

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
