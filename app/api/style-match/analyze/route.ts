import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { downloadHairPhotoAsBase64, getMostRecentHairPhoto } from "@/lib/hairPhotos";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Uploaded with the service-role key rather than the user's own session
// so this works with no storage RLS policy on the bucket at all -- the
// bucket ("style-match-images") is public-read, so the resulting URL is
// usable directly by the client and stored on style_matches/saved_styles.
// Best-effort: a failure here must not fail the whole analysis, since
// the detected style is the important part and image_url is secondary.
async function uploadStyleImage(base64: string, mediaType: string): Promise<string | null> {
  const extension = IMAGE_EXTENSION_BY_MIME[mediaType];
  if (!extension) return null;

  try {
    const buffer = Buffer.from(base64, "base64");
    const path = `uploads/${crypto.randomUUID()}.${extension}`;
    const { error } = await getSupabaseAdmin()
      .storage.from("style-match-images")
      .upload(path, buffer, { contentType: mediaType });

    if (error) {
      console.error("[style-match/analyze] Failed to upload style image:", error);
      return null;
    }

    const { data } = getSupabaseAdmin().storage.from("style-match-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("[style-match/analyze] Failed to upload style image:", err);
    return null;
  }
}

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function buildAnalysisInstructions(opts: {
  colorMatch: boolean;
  translateForHairType: boolean;
  curlType: string | null;
  // "photo-photo": current hair photo + desired style photo (both images).
  // "photo-text": current hair photo + desired style described in words.
  // "none": no current hair photo on file -- original single-image/text flow.
  currentPhotoMode: "photo-photo" | "photo-text" | "none";
  desiredText?: string;
}): string {
  const fields = [
    `"style_name": "name of the hairstyle (e.g. Box Braids, Wash and Go, Twist Out, Knotless Braids, Locs, Bantu Knots, etc)"`,
    `"style_description": "2 sentence description of what this style is"`,
    `"hair_length": "short/medium/long"`,
    `"requires_fake_hair": true/false`,
    `"fake_hair_type": "type of fake hair needed if any (e.g. braiding hair, crochet hair, lace front wig) or null"`,
    `"accessories_visible": ["list of accessories visible like beads, bands, ribbons, clips"]`,
    `"estimated_time": "how long this style typically takes"`,
    `"difficulty": "beginner/intermediate/advanced"`,
    `"compatible_hair_types": ["array of curl types this style works for e.g. 3c, 4a, 4b, 4c"]`,
    `"maintenance_tips": "one sentence on maintaining this style"`,
  ];

  if (opts.colorMatch) {
    fields.push(
      `"detected_color": "the primary hair color shown or described (e.g. honey blonde, burgundy, jet black), or null if no specific color is shown/mentioned"`
    );
  }
  if (opts.translateForHairType) {
    fields.push(
      `"hair_type_translation": "how this style would translate onto ${opts.curlType ?? "the user's"} hair specifically, and what modifications may be needed -- 2-3 sentences"`
    );
  }
  if (opts.currentPhotoMode !== "none") {
    fields.push(
      `"current_to_desired_translation": "One paragraph explaining specifically how to achieve the desired style starting from the user's current hair shown in Image 1. Note any length difference, texture differences, or significant preparation needed."`,
      `"length_gap": "none/slight/moderate/significant -- how much length difference exists between current and desired"`,
      `"prep_needed": ["array of preparation steps specific to going from current hair to desired style"]`
    );
  }

  const translateNote = opts.translateForHairType
    ? `\n\nNote: the user has ${opts.curlType ?? "an unspecified"} hair type. Explain how this style would translate to their hair type and what modifications may be needed.`
    : "";

  if (opts.currentPhotoMode === "photo-photo") {
    return `Image 1 is the user's current hair. Image 2 is the hairstyle they want to achieve.\nAnalyze the desired style (Image 2) and return the standard JSON response.\nAdditionally include these fields about the translation:\n{\n  ${fields.join(",\n  ")}\n}${translateNote}\nReturn ONLY the JSON object, no other text.`;
  }

  if (opts.currentPhotoMode === "photo-text") {
    return `Image 1 is the user's current hair. They want to achieve this hairstyle: "${opts.desiredText ?? ""}".\nAnalyze the desired style described above and return the standard JSON response.\nAdditionally include these fields about the translation:\n{\n  ${fields.join(",\n  ")}\n}${translateNote}\nReturn ONLY the JSON object, no other text.`;
  }

  return `Analyze this hairstyle image and return a JSON object with these exact fields:\n{\n  ${fields.join(",\n  ")}\n}${translateNote}\nReturn ONLY the JSON object, no other text.`;
}

type DetectedStyle = {
  style_name: string;
  style_description: string;
  hair_length: string;
  requires_fake_hair: boolean;
  fake_hair_type: string | null;
  accessories_visible: string[];
  estimated_time: string;
  difficulty: string;
  compatible_hair_types: string[];
  maintenance_tips: string;
  detected_color?: string | null;
  hair_type_translation?: string | null;
  image_url?: string | null;
  current_to_desired_translation?: string | null;
  length_gap?: string | null;
  prep_needed?: string[];
};

// Claude sometimes wraps JSON in a ```json ... ``` fence despite being
// told not to -- strip that before parsing rather than fail on it.
function parseDetectedStyle(rawText: string): DetectedStyle | null {
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(stripped) as DetectedStyle;
  } catch (err) {
    console.error("[style-match/analyze] Failed to parse model response as JSON:", err, stripped);
    return null;
  }
}

export async function POST(request: Request) {
  console.log("[style-match/analyze] route hit");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[style-match/analyze] ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      { error: "Style analysis is not configured yet. Please try again later." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const {
    input_type,
    image_base64,
    image_media_type,
    text,
    color_match,
    translate_for_hair_type,
    curl_type,
    user_id,
  }: {
    input_type?: "photo" | "text";
    image_base64?: string;
    image_media_type?: string;
    text?: string;
    color_match?: boolean;
    translate_for_hair_type?: boolean;
    curl_type?: string | null;
    user_id?: string;
  } = body;

  // Part 2: pull in the user's most recent hair photo (if any) so the
  // analysis can speak to their actual current hair, not just the
  // desired style. Never fatal -- a lookup/download failure just falls
  // back to the original single-image/text flow.
  let currentHairPhoto: { base64: string; mediaType: string } | null = null;
  if (user_id) {
    try {
      const recent = await getMostRecentHairPhoto(user_id);
      if (recent) currentHairPhoto = await downloadHairPhotoAsBase64(recent.path);
    } catch (err) {
      console.error("[style-match/analyze] Failed to load current hair photo:", err);
    }
  }

  const currentPhotoMode: "photo-photo" | "photo-text" | "none" = !currentHairPhoto
    ? "none"
    : input_type === "photo"
    ? "photo-photo"
    : "photo-text";

  const analysisInstructions = buildAnalysisInstructions({
    colorMatch: Boolean(color_match),
    translateForHairType: Boolean(translate_for_hair_type),
    curlType: curl_type ?? null,
    currentPhotoMode,
    desiredText: text,
  });

  let messageContent: unknown[];
  // Kicked off alongside the Anthropic call (not awaited yet) so the
  // upload and the analysis happen concurrently rather than adding to
  // the ~10s wait shown in the loading overlay.
  let imageUploadPromise: Promise<string | null> = Promise.resolve(null);

  const currentHairImageBlock = currentHairPhoto
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: currentHairPhoto.mediaType,
            data: currentHairPhoto.base64,
          },
        },
      ]
    : [];

  if (input_type === "photo") {
    if (!image_base64 || !image_media_type) {
      return NextResponse.json(
        { error: "image_base64 and image_media_type are required for photo input." },
        { status: 400 }
      );
    }
    if (!SUPPORTED_IMAGE_TYPES.has(image_media_type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${image_media_type}` },
        { status: 400 }
      );
    }

    imageUploadPromise = uploadStyleImage(image_base64, image_media_type);

    messageContent = [
      ...currentHairImageBlock,
      {
        type: "image",
        source: {
          type: "base64",
          media_type: image_media_type,
          data: image_base64,
        },
      },
      {
        type: "text",
        text: analysisInstructions,
      },
    ];
  } else if (input_type === "text") {
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "text is required for text input." },
        { status: 400 }
      );
    }

    messageContent = [
      ...currentHairImageBlock,
      {
        type: "text",
        text: currentPhotoMode === "photo-text"
          ? analysisInstructions
          : `The user wants this hairstyle: "${text.trim()}". Return the same JSON structure as below based on the described style.\n\n${analysisInstructions}`,
      },
    ];
  } else {
    return NextResponse.json(
      { error: "input_type must be 'photo' or 'text'." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        "[style-match/analyze] Anthropic API error:",
        response.status,
        errorBody
      );
      return NextResponse.json(
        { error: "Couldn't analyze this style. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text;

    if (typeof rawText !== "string") {
      console.error("[style-match/analyze] Unexpected Anthropic response shape:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Couldn't analyze this style. Please try again." },
        { status: 502 }
      );
    }

    const detected = parseDetectedStyle(rawText);
    if (!detected) {
      return NextResponse.json(
        { error: "Couldn't understand the style analysis. Please try again." },
        { status: 502 }
      );
    }

    const imageUrl = await imageUploadPromise;

    console.log("[style-match/analyze] detected style:", detected.style_name);
    return NextResponse.json({ ...detected, image_url: imageUrl });
  } catch (err) {
    console.error("[style-match/analyze] Failed to reach Anthropic API:", err);
    return NextResponse.json(
      { error: "Couldn't reach the style analysis service. Please try again." },
      { status: 500 }
    );
  }
}
