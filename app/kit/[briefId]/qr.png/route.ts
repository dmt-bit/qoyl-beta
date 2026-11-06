import { NextResponse } from "next/server";
import QRCode from "qrcode";

// Generates a QR code PNG for the kit page.
// /kit/[briefId]/qr.png?src=event-dec6
// Used on printed look cards so attendees can scan to their kit.
export async function GET(
  request: Request,
  { params }: { params: { briefId: string } }
) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src") ?? "";

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qoyl.live";
  const kitUrl = src
    ? `${origin}/kit/${params.briefId}?src=${encodeURIComponent(src)}`
    : `${origin}/kit/${params.briefId}`;

  try {
    const pngBuffer = await QRCode.toBuffer(kitUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    });

    return new NextResponse(pngBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[kit/qr.png] QR generation failed:", err);
    return NextResponse.json({ error: "QR generation failed." }, { status: 500 });
  }
}
