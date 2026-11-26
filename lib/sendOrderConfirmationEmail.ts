import { getResend } from "@/lib/resend";
import type { CartItem } from "@/lib/styleCart";

const FROM_ADDRESS = "Qoyl <hey@qoyl.live>";

export type SendOrderConfirmationResult =
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

export async function sendOrderConfirmationEmail(params: {
  recipientEmail: string;
  firstName: string | null;
  orderId: string;
  items: CartItem[];
  subtotalUsd: number;
  serviceFeeUsd: number;
  totalUsd: number;
  shippingAddress: ShippingAddress | null;
}): Promise<SendOrderConfirmationResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping order confirmation email.");
    return { sent: false, reason: "no_api_key" };
  }

  const { recipientEmail, firstName, orderId, items, subtotalUsd, serviceFeeUsd, totalUsd, shippingAddress } = params;
  const name = firstName?.trim() || "there";

  function fmt(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  const purchasableItems = items.filter((i) => i.product_type !== "tutorial");

  const itemRows = purchasableItems.map((item) => {
    const qty = item.quantity ?? 1;
    const price = item.price_estimate != null
      ? fmt(item.price_estimate * qty)
      : "Price TBD";
    return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #EAE4DC; font-size: 14px; color: #1A1510;">
          ${item.product_name}${qty > 1 ? ` <span style="color: #9A8E82;">×${qty}</span>` : ""}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #EAE4DC; font-size: 14px; color: #1A1510; text-align: right; white-space: nowrap;">
          ${price}
        </td>
      </tr>`;
  }).join("");

  const addrLines = shippingAddress
    ? [
        shippingAddress.name,
        shippingAddress.line1,
        shippingAddress.line2,
        `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`,
        shippingAddress.country,
      ].filter(Boolean).join("<br>")
    : "Collected at checkout";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Qoyl order is confirmed</title>
</head>
<body style="margin: 0; padding: 0; background: #F9F5F0; font-family: 'DM Sans', system-ui, -apple-system, sans-serif;">
  <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 20px; overflow: hidden; border: 1px solid #EAE4DC;">

    <!-- Header -->
    <div style="background: #1A1510; padding: 32px 36px 28px;">
      <p style="margin: 0 0 20px; font-size: 22px; font-weight: 300; color: white; letter-spacing: 0.08em;">
        QOYL
      </p>
      <div style="width: 52px; height: 52px; border-radius: 50%; border: 2px solid #C8A86A;
        display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <span style="font-size: 22px;">✓</span>
      </div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 300; color: white; line-height: 1.2;">
        Order confirmed,<br>${name}
      </h1>
      <p style="margin: 10px 0 0; font-size: 14px; color: #C8B896; line-height: 1.6;">
        We're on it. The Qoyl team will purchase every item and ship them straight to your door.
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 36px;">

      <!-- What happens next -->
      <div style="margin-bottom: 28px;">
        <h2 style="margin: 0 0 16px; font-size: 13px; font-weight: 500; color: #9A8E82;
          letter-spacing: 0.1em; text-transform: uppercase;">What happens next</h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${[
            ["🛍️", "We shop", "Our team sources each product from the retailer on your behalf."],
            ["📦", "We pack &amp; ship", "Your items are carefully packaged and shipped to your address."],
            ["📬", "You receive", "Expect your order within 5–10 business days. We'll email you a tracking number once it ships."],
          ].map(([icon, title, desc]) => `
          <div style="display: flex; gap: 14px; align-items: flex-start;">
            <div style="font-size: 20px; line-height: 1; flex-shrink: 0; margin-top: 1px;">${icon}</div>
            <div>
              <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1A1510;">${title}</p>
              <p style="margin: 3px 0 0; font-size: 13px; color: #7A6E65; line-height: 1.5;">${desc}</p>
            </div>
          </div>`).join("")}
        </div>
      </div>

      <!-- Order summary -->
      <div style="background: #F9F5F0; border-radius: 14px; padding: 20px 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 14px; font-size: 13px; font-weight: 500; color: #9A8E82;
          letter-spacing: 0.1em; text-transform: uppercase;">Order summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemRows}
          <tr>
            <td style="padding: 10px 0 4px; font-size: 13px; color: #7A6E65;">Subtotal</td>
            <td style="padding: 10px 0 4px; font-size: 13px; color: #7A6E65; text-align: right;">${fmt(subtotalUsd)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 13px; color: #7A6E65;">Fulfillment service (10%)</td>
            <td style="padding: 4px 0; font-size: 13px; color: #7A6E65; text-align: right;">${fmt(serviceFeeUsd)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0 0; font-size: 15px; font-weight: 500; color: #1A1510; border-top: 1px solid #DDD5C8;">Total paid</td>
            <td style="padding: 10px 0 0; font-size: 15px; font-weight: 500; color: #1A1510; text-align: right; border-top: 1px solid #DDD5C8;">${fmt(totalUsd)}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping address -->
      ${shippingAddress ? `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 10px; font-size: 13px; font-weight: 500; color: #9A8E82;
          letter-spacing: 0.1em; text-transform: uppercase;">Shipping to</h2>
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
        Questions? Reply to this email or reach us at <a href="mailto:hey@qoyl.live" style="color: #C8A86A;">hey@qoyl.live</a>
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
      subject: `Your Qoyl order is confirmed — we're shopping for you`,
      html,
    });

    if (error) {
      console.error("[orderConfirmation] Resend rejected:", recipientEmail, error);
      return { sent: false, reason: "api_error", error };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[orderConfirmation] threw:", recipientEmail, err);
    return { sent: false, reason: "threw", error: err };
  }
}
