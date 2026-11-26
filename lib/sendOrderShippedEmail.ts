import { getResend } from "@/lib/resend";

const FROM_ADDRESS = "Qoyl <hey@qoyl.live>";

export type SendOrderShippedResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no_api_key" }
  | { sent: false; reason: "api_error"; error: { message: string; name: string; statusCode: number | null } }
  | { sent: false; reason: "threw"; error: unknown };

type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export async function sendOrderShippedEmail(params: {
  recipientEmail: string;
  firstName: string | null;
  orderId: string;
  trackingNumber: string | null;
  shippingAddress: ShippingAddress | null;
}): Promise<SendOrderShippedResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping order shipped email.");
    return { sent: false, reason: "no_api_key" };
  }

  const { recipientEmail, firstName, orderId, trackingNumber, shippingAddress } = params;
  const name = firstName?.trim() || "there";

  // Build a tracking URL for common carriers based on number pattern
  function guessTrackingUrl(num: string): string | null {
    const n = num.trim().toUpperCase();
    if (/^1Z/.test(n)) return `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`;
    if (/^\d{22}$/.test(n) || /^\d{12}$/.test(n) || /^\d{15}$/.test(n)) {
      return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(n)}`;
    }
    if (/^\d{20,22}$/.test(n) || /^9[2345]\d{20,}/.test(n)) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`;
    }
    return null;
  }

  const trackingUrl = trackingNumber ? guessTrackingUrl(trackingNumber) : null;

  const addrLines = shippingAddress
    ? [
        shippingAddress.name,
        shippingAddress.line1,
        shippingAddress.line2,
        `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`,
        shippingAddress.country,
      ].filter(Boolean).join("<br>")
    : null;

  const trackingBlock = trackingNumber ? `
    <div style="background: #F3EDE5; border-radius: 14px; padding: 20px 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 13px; font-weight: 500; color: #9A8E82;
        letter-spacing: 0.08em; text-transform: uppercase;">Tracking number</p>
      <p style="margin: 0 0 14px; font-size: 18px; font-weight: 500; color: #1A1510; font-family: monospace;">
        ${trackingNumber}
      </p>
      ${trackingUrl ? `
      <a href="${trackingUrl}" target="_blank"
        style="display: inline-block; padding: 10px 28px; border-radius: 100px;
          background: linear-gradient(135deg, #C8A86A, #A8863A);
          color: #1A1510; text-decoration: none; font-size: 13px; font-weight: 500;
          letter-spacing: 0.06em;">
        Track my package →
      </a>` : ""}
    </div>` : `
    <div style="background: #F9F5F0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #7A6E65; line-height: 1.6;">
        Your tracking number will be available soon from the carrier.
        If you have any questions, reply to this email.
      </p>
    </div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Qoyl order has shipped</title>
</head>
<body style="margin: 0; padding: 0; background: #F9F5F0; font-family: 'DM Sans', system-ui, -apple-system, sans-serif;">
  <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 20px; overflow: hidden; border: 1px solid #EAE4DC;">

    <!-- Header -->
    <div style="background: #1A1510; padding: 32px 36px 28px;">
      <p style="margin: 0 0 20px; font-size: 22px; font-weight: 300; color: white; letter-spacing: 0.08em;">
        QOYL
      </p>
      <div style="font-size: 36px; margin-bottom: 16px;">📦</div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 300; color: white; line-height: 1.2;">
        Your order is<br>on its way, ${name}!
      </h1>
      <p style="margin: 10px 0 0; font-size: 14px; color: #C8B896; line-height: 1.6;">
        We've purchased and shipped your Qoyl products. They're headed to your door.
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 36px;">

      <!-- Tracking -->
      ${trackingBlock}

      <!-- Shipping address -->
      ${addrLines ? `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 10px; font-size: 13px; font-weight: 500; color: #9A8E82;
          letter-spacing: 0.1em; text-transform: uppercase;">Delivering to</h2>
        <p style="margin: 0; font-size: 14px; color: #1A1510; line-height: 1.7;">${addrLines}</p>
      </div>` : ""}

      <!-- Order ID -->
      <div style="background: #F3EDE5; border-radius: 10px; padding: 12px 16px; margin-bottom: 28px;">
        <p style="margin: 0 0 2px; font-size: 10px; color: #9A8E82; letter-spacing: 0.1em; text-transform: uppercase;">Order ID</p>
        <p style="margin: 0; font-size: 12px; color: #5A4E42; font-family: monospace;">${orderId}</p>
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <a href="https://qoyl.live/dashboard"
          style="display: inline-block; padding: 13px 36px; border-radius: 100px;
            background: linear-gradient(135deg, #C8A86A, #A8863A);
            color: #1A1510; text-decoration: none; font-size: 14px; font-weight: 500;
            letter-spacing: 0.06em;">
          View my shelf
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #EAE4DC; padding: 20px 36px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9A8E82; line-height: 1.6;">
        Questions about your order? Reply to this email or reach us at
        <a href="mailto:hey@qoyl.live" style="color: #C8A86A;">hey@qoyl.live</a>
      </p>
      <p style="margin: 8px 0 0; font-size: 11px; color: #B0A898;">
        Qoyl · Your personal hair shopping service
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `Your Qoyl order has shipped 📦`,
      html,
    });

    if (error) {
      console.error("[orderShipped] Resend rejected:", recipientEmail, error);
      return { sent: false, reason: "api_error", error };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[orderShipped] threw:", recipientEmail, err);
    return { sent: false, reason: "threw", error: err };
  }
}
