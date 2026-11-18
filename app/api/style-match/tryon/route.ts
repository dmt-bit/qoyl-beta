import { NextRequest, NextResponse } from "next/server";

// Virtual hair try-on via fal.ai
// Requires FAL_KEY environment variable set in Vercel.
// Model: fal-ai/hair-swap -- transfers hairstyle from reference onto user selfie.

export async function POST(req: NextRequest) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json(
      { error: "Virtual try-on is not configured. Contact support." },
      { status: 503 }
    );
  }

  let body: { selfieBase64?: string; referenceImageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { selfieBase64, referenceImageUrl } = body;

  if (!selfieBase64 || !referenceImageUrl) {
    return NextResponse.json(
      { error: "selfieBase64 and referenceImageUrl are required" },
      { status: 400 }
    );
  }

  // Convert base64 to data URL if not already
  const selfieDataUrl = selfieBase64.startsWith("data:")
    ? selfieBase64
    : `data:image/jpeg;base64,${selfieBase64}`;

  try {
    // Upload selfie to fal storage first (required for image inputs)
    await fetch("https://fal.run/fal-ai/fast-sdxl/upload", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image_url: selfieDataUrl }),
    });

    // fal.ai hair-swap: transfers hair from reference_image onto face_image
    const falRes = await fetch("https://fal.run/fal-ai/hair-swap", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // face_image: the user's selfie (who we're putting hair on)
        face_image_url: selfieDataUrl,
        // hair_image: the reference style photo (where we get the hair from)
        hair_image_url: referenceImageUrl,
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error("fal.ai hair-swap error:", falRes.status, errText);
      return NextResponse.json(
        { error: "Try-on generation failed. Please try again." },
        { status: 502 }
      );
    }

    const result = await falRes.json();

    // fal.ai returns { image: { url: "..." } } or { images: [{url: "..."}] }
    const outputUrl =
      result?.image?.url ??
      result?.images?.[0]?.url ??
      result?.output?.image?.url ??
      null;

    if (!outputUrl) {
      console.error("fal.ai unexpected response shape:", JSON.stringify(result).slice(0, 500));
      return NextResponse.json(
        { error: "Try-on generation failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ imageUrl: outputUrl });
  } catch (err) {
    console.error("try-on route error:", err);
    return NextResponse.json(
      { error: "Try-on generation failed. Please try again." },
      { status: 500 }
    );
  }
}
