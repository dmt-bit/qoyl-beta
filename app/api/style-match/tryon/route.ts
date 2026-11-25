import { NextRequest, NextResponse } from "next/server";

// Virtual hair try-on via fal.ai
// Requires FAL_KEY environment variable set in Vercel.
// Model: fal-ai/hair-swap -- transfers hairstyle from reference onto user selfie.

async function uploadToFalStorage(
  imageDataUrl: string,
  falKey: string
): Promise<string> {
  // Extract base64 and content type from data URL
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const [, contentType, base64Data] = match;

  // Convert base64 to binary buffer
  const binaryData = Buffer.from(base64Data, "base64");

  // Step 1: Initiate upload -- get a presigned PUT URL and the final file_url
  const initiateRes = await fetch(
    "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content_type: contentType,
        file_name: "selfie.jpg",
      }),
    }
  );

  if (!initiateRes.ok) {
    const errText = await initiateRes.text();
    throw new Error(`fal storage initiate failed ${initiateRes.status}: ${errText}`);
  }

  const { file_url, upload_url } = (await initiateRes.json()) as {
    file_url: string;
    upload_url: string;
  };

  // Step 2: PUT binary data to the presigned URL (no auth header needed)
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: binaryData,
  });

  if (!uploadRes.ok) {
    throw new Error(`fal storage PUT failed ${uploadRes.status}`);
  }

  return file_url;
}

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

  // Ensure selfie is a full data URL
  const selfieDataUrl = selfieBase64.startsWith("data:")
    ? selfieBase64
    : `data:image/jpeg;base64,${selfieBase64}`;

  try {
    // Upload selfie to fal CDN storage to get a hosted HTTPS URL
    // (fal hair-swap model requires hosted URLs, not data URIs)
    let selfieUrl: string;
    try {
      selfieUrl = await uploadToFalStorage(selfieDataUrl, falKey);
    } catch (uploadErr) {
      const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.error("fal storage upload error:", msg);
      return NextResponse.json(
        { error: `Upload failed: ${msg}` },
        { status: 502 }
      );
    }

    // fal.ai hair-swap: transfers hair from reference_image onto face_image
    const falRes = await fetch("https://fal.run/fal-ai/hair-swap", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // face_image: the user's selfie (who we're putting hair on)
        face_image_url: selfieUrl,
        // hair_image: the reference style photo (where we get the hair from)
        hair_image_url: referenceImageUrl,
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error("fal.ai hair-swap error:", falRes.status, errText);
      return NextResponse.json(
        { error: `hair-swap ${falRes.status}: ${errText.slice(0, 300)}` },
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
      const shape = JSON.stringify(result).slice(0, 300);
      console.error("fal.ai unexpected response shape:", shape);
      return NextResponse.json(
        { error: `Unexpected response: ${shape}` },
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
