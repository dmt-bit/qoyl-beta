import { getResend } from "@/lib/resend";
import { getAffiliateLink } from "@/lib/affiliateLinks";
import type { TravelKitProduct } from "@/lib/travelKitGenerator";

const FROM_ADDRESS = "Qoyl <hey@qoyl.live>";

const SWIMMING_LABELS: Record<string, string> = {
  no_swimming: "No swimming",
  pool: "Pool swimming",
  ocean: "Ocean or open water",
  hot_tub: "Hot tub",
  multiple: "Multiple (pool + ocean etc)",
};

const PROTECTIVE_STYLE_LABELS: Record<string, string> = {
  none: "Wearing natural hair",
  braids_twists: "Braids or twists",
  weave_sew_in: "Weave or sew-in",
  wig: "Wig",
  locs: "Locs",
  not_sure: "Not sure yet",
};

const CLIMATE_LABELS: Record<string, string> = {
  humid: "Humid",
  tropical: "Tropical",
  dry: "Dry",
  "cold-dry": "Cold & dry",
  similar_to_home: "Similar to home",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderProductRow(item: TravelKitProduct): string {
  // A Qoyl Partner Brand pick (item 7) has a real product_url from
  // brand_catalog_products - link there directly rather than falling
  // through to the name-keyword affiliate-link lookup, which has no
  // entry for indie brand products.
  const link = item.isBrandProduct ? item.brandProductUrl ?? null : getAffiliateLink(item.name, item.brand);
  const shopLine = link
    ? `<a href="${link}" style="color:#444444;text-decoration:none;">Shop this product &rarr;</a>`
    : "";
  const partnerBadge = item.isBrandProduct
    ? `<span style="display:inline-block;margin-left:6px;padding:1px 6px;border:1px solid #B08D57;border-radius:10px;font-size:10px;color:#B08D57;">Qoyl Partner Brand</span>`
    : "";

  return `
    <tr><td style="padding:0 0 20px;border-bottom:1px solid #e8e8e8;">
      <div style="font-size:14px;font-weight:600;color:#0a0a0a;">${escapeHtml(item.name)}${partnerBadge}</div>
      <div style="font-size:12px;color:#0a0a0a;margin-top:2px;">${escapeHtml(item.brand)}</div>
      <div style="font-size:12px;color:#888888;margin-top:6px;line-height:1.6;">${escapeHtml(item.reason)}</div>
      <div style="margin-top:8px;font-size:12px;">${shopLine}</div>
    </td></tr>`;
}

export type SendTravelKitEmailInput = {
  recipientEmail: string;
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  travelMonth: string | null;
  climate: string | null;
  swimming: string | null;
  protectiveStyle: string | null;
  products: TravelKitProduct[];
};

export type SendTravelKitEmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: "no_api_key" }
  | {
      sent: false;
      reason: "api_error";
      error: { message: string; name: string; statusCode: number | null };
    }
  | { sent: false; reason: "threw"; error: unknown };

export async function sendTravelKitEmail(
  input: SendTravelKitEmailInput
): Promise<SendTravelKitEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("[travel-kit-email] Resend not configured");
    return { sent: false, reason: "no_api_key" };
  }

  const datePart = input.travelMonth
    ? escapeHtml(input.travelMonth)
    : `${formatDate(input.departureDate)} to ${formatDate(input.returnDate)}`;
  const tripLine = `${escapeHtml(input.destination)} · ${datePart}`;

  const contextChips = [
    input.climate ? CLIMATE_LABELS[input.climate] ?? input.climate : null,
    input.swimming ? SWIMMING_LABELS[input.swimming] ?? input.swimming : null,
    input.protectiveStyle
      ? PROTECTIVE_STYLE_LABELS[input.protectiveStyle] ?? input.protectiveStyle
      : null,
  ]
    .filter((c): c is string => Boolean(c))
    .join(" &middot; ");

  const productRows = input.products.map(renderProductRow).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="padding:32px 32px 0;text-align:center;">
    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;color:#0a0a0a;">qoyl</span>
  </div>
  <div style="padding:24px 32px 0;">
    <h1 style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:500;color:#0a0a0a;margin:0 0 8px;">
      Your kit for ${tripLine}
    </h1>
    ${contextChips ? `<p style="font-size:12px;color:#0a0a0a;margin:0 0 24px;">${contextChips}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
      ${productRows}
    </table>
    <a href="https://qoyl.live/travel" style="display:inline-block;background:#0a0a0a;color:#ffffff;border-radius:4px;padding:12px 28px;font-size:12px;font-weight:500;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase;">
      View your full kit
    </a>
  </div>
  <div style="padding:28px 32px 32px;margin-top:16px;">
    <p style="font-size:12px;color:#888888;line-height:1.7;margin:0 0 4px;">Questions? Reply to this email.</p>
    <p style="font-size:12px;color:#0a0a0a;margin:0;">The Qoyl Team</p>
  </div>
</div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.recipientEmail,
      subject: `Your Qoyl travel kit for ${input.destination} is ready`,
      html,
    });

    if (error) {
      console.error("[travel-kit-email] Resend API rejected travel kit email:", error);
      return { sent: false, reason: "api_error", error };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[travel-kit-email] Failed to send travel kit email:", err);
    return { sent: false, reason: "threw", error: err };
  }
}
