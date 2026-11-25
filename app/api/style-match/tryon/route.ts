import { NextRequest, NextResponse } from "next/server";

// Virtual hair try-on via fal.ai
// Model: fal-ai/image-editing/hair-change
// Flow:
//   1. If no hairPrompt provided, call Claude vision to describe the hair in referenceImageUrl
//   2. Upload selfie to fal CDN storage
//   3. Call fal hair-change with selfie URL + hair style prompt
//   4. Return result image URL + the prompt used (so UI can show/cache it)

export const maxDuration = 45;

const ANTHROPIC_MODEL = "claude-haiku-4-5";

async function describeHairStyle(referenceImageUrl: string, anthropicKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: referenceImageUrl },
            },
            {
              type: "text",
              text: "Describe the hairstyle in this image in 10 words or fewer. Focus only on the hair: length, texture, cut, and color. Use plain descriptive language suitable as a prompt for an AI hair-change model. Examples: 'long wavy brunette layers', 'short textured natural afro', 'blunt bob with copper highlights'. Reply with only the hair description, nothing else.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude vision failed ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("Empty response from Claude vision");
  return text;
}

async function uploadToFalStorage(imageDataUrl: string, falKey: string): Promise<string> {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const [, contentType, base64Data] = match;
  const binaryData = Buffer.from(base64Data, "base64");

  // Step 1: get a presigned PUT URL
  const initiateRes = await fetch(
    "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content_type: contentType, file_name: "selfie.jpg" }),
    }
  );

  if (!initiateRes.ok) {
    const err = await initiateRes.text();
    throw new Error(`fal storage initiate failed ${initiateRes.status}: ${err}`);
  }

  const { file_url, upload_url } = (await initiateRes.json()) as {
    file_url: string;
    upload_url: string;
  };

  // Step 2: PUT binary data to presigned URL
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
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!falKey) {
    return NextResponse.json(
      { error: "Virtual try-on is not configured. Contact support." },
      { status: 503 }
    );
  }

  let body: { selfieBase64?: string; referenceImageUrl?: string; hairPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { selfieBase64, referenceImageUrl, hairPrompt } = body;

  if (!selfieBase64 || !referenceImageUrl) {
    return NextResponse.json(
      { error: "selfieBase64 and referenceImageUrl are required" },
      { status: 400 }
    );
  }

  const selfieDataUrl = selfieBase64.startsWith("data:")
    ? selfieBase64
    : `data:image/jpeg;base64,${selfieBase64}`;

  try {
    // Step 1: get hair style prompt (use provided one or generate via Claude vision)
    let prompt = hairPrompt?.trim();
    if (!prompt) {
      if (!anthropicKey) {
        prompt = "natural hair style";
      } else {
        try {
          prompt = await describeHairStyle(referenceImageUrl, anthropicKey);
        } catch (err) {
          console.error("Claude vision error:", err);
          prompt = "natural hair style";
        }
      }
    }

    // Step 2: upload selfie to fal CDN storage
    let selfieUrl: string;
    try {
      selfieUrl = await uploadToFalStorage(selfieDataUrl, falKey);
    } catch (uploadErr) {
      console.error("fal storage upload error:", uploadErr);
      return NextResponse.json(
        { error: "Could not upload photo for processing. Please try again." },
        { status: 502 }
      );
    }

    // Step 3: call fal hair-change model
    const falRes = await fetch("https://fal.run/fal-ai/image-editing/hair-change", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: selfieUrl,
        prompt,
        num_inference_steps: 30,
        guidance_scale: 3.5,
        output_format: "jpeg",
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error("fal hair-change error:", falRes.status, errText);
      return NextResponse.json(
        { error: "Try-on generation failed. Please try again." },
        { status: 502 }
      );
    }

    const result = await falRes.json();

    // fal returns { images: [{ url: "..." }] }
    const outputUrl =
      result?.images?.[0]?.url ??
      result?.image?.url ??
      result?.output?.image?.url ??
      null;

    if (!outputUrl) {
      console.error("fal hair-change unexpected response:", JSON.stringify(result).slice(0, 300));
      return NextResponse.json(
        { error: "Try-on generation failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ imageUrl: outputUrl, promptUsed: prompt });
  } catch (err) {
    console.error("try-on route error:", err);
    return NextResponse.json(
      { error: "Try-on generation failed. Please try again." },
      { status: 500 }
    );
  }
}
