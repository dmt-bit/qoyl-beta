import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// POST routes that read the request body are never statically optimized
// regardless, but this makes it explicit rather than implicit.
export const dynamic = "force-dynamic";

// 25s: enough headroom for a single-image call even on a slow response,
// well under Pro's ceiling. Harmless on Hobby - that plan hard-caps at
// 10s regardless of what's set here, which is exactly why the real fix
// is keeping this call fast (smaller image, shorter prompt, and no
// current-hair-photo image in this call at all - see
// app/api/style-match/translate/route.ts for that part now).
export const maxDuration = 25;

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Uploaded with the service-role key rather than the user's own session
// so this works with no storage RLS policy on the bucket at all - the
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

// Disambiguation guidance for the style subtypes that get mixed up most
// often (checked against real confusion cases, not hypothetical) - kept
// as INPUT context, not output fields, so it doesn't add to generation
// time the way more output fields would (input tokens process in
// parallel; output tokens are generated serially, so this is the
// low-cost side of the prompt to spend on). Feeds into confidence/
// confidence_reason/alternative_style below, which is what actually
// drives the frontend's disambiguation step for a medium/low-confidence
// call - see app/style-match/page.tsx's "disambiguate" pageState.
const STYLE_DISAMBIGUATION_GUIDANCE = `You are a professional hair stylist with expertise in identifying specific hairstyles from photos. Identify the hairstyle with precision.

CRITICAL: Be specific about style subtypes. Do not use a general category name when a more specific style is visible - "Knotless Braids" not "Braids", "Baby Bangs" not "Bangs".

BANG STYLES - distinguish carefully:
- baby bangs: very short, sitting AT or ABOVE the eyebrow, typically 1-2 inches long
- micro bangs: extremely short, sitting WELL ABOVE the eyebrow, forehead mostly visible
- curtain bangs: LONGER bangs, parted in the MIDDLE, swept to the SIDES of the face, eyebrows fully visible
- blunt bangs: straight ACROSS at eyebrow level, uniform length, not swept to sides
- side swept bangs: swept to ONE side only
- wispy bangs: soft, feathery, not blunt
Before identifying any bang style, check: where does the bang end relative to the eyebrow? Is it parted in the middle (curtain)? Swept to one side (side swept)? Very short and blunt (baby)? Soft and feathery (wispy)?

CURL/WAVE STYLES - distinguish carefully:
- wash and go: natural curl pattern with defining products, no manipulation
- twist out: unraveled twists creating a defined stretched curl pattern
- braid out: unraveled braids creating a wave/curl pattern
- roller set: uniform curl from rollers
- flexi rod set: defined spiral curls from flexible rods

BRAID STYLES - distinguish carefully:
- box braids: individual braids with a square section at the root
- knotless braids: feed-in braids with no knot at the root, starts with natural hair
- cornrows: braids flat against the scalp
- goddess braids: large chunky braids, often with loose curls at ends
- micro braids: very thin individual braids

PROTECTIVE STYLES - distinguish:
- faux locs: wrapped or crocheted locs using extension hair
- starter locs: real locs just beginning
- passion twists: twists using water wave extension hair
- senegalese twists: rope twists using straight extension hair`;

// Shortened deliberately - fewer/shorter fields means less output for
// the model to generate, which is a direct, significant chunk of total
// response time. current_to_desired_translation/length_gap/prep_needed
// used to live here too, but that meant every request with a current
// hair photo attached the photo AND asked for more output in the same
// call. That's now a separate, tiny, image-free follow-up call fired
// after this one returns - see app/api/style-match/translate/route.ts.
// confidence/confidence_reason/alternative_style/bang_length are new
// (disambiguation feature) - kept short (one sentence max, single
// words/null) to limit how much this adds to generation time.
function buildAnalysisInstructions(opts: {
  colorMatch: boolean;
  translateForHairType: boolean;
  curlType: string | null;
}): string {
  const fields = [
    `"style_name": "specific style name - use the precise subtype, not the general category"`,
    `"style_description": "one sentence only"`,
    `"confidence": "high/medium/low"`,
    `"confidence_reason": "one sentence on what visual features confirmed this identification"`,
    `"alternative_style": "if confidence is medium or low, the other specific style this could be instead - else null"`,
    `"hair_length": "short/medium/long"`,
    `"bang_length": "above-eyebrow/at-eyebrow/below-eyebrow/cheekbone-length - only if bangs are visible, else null"`,
    `"requires_fake_hair": true/false`,
    `"fake_hair_type": "type or null"`,
    `"accessories_visible": []`,
    `"estimated_time": "X hours"`,
    `"difficulty": "beginner/intermediate/advanced"`,
    `"compatible_hair_types": []`,
  ];

  if (opts.colorMatch) {
    fields.push(`"detected_color": "primary color shown/described, or null"`);
  }
  if (opts.translateForHairType) {
    fields.push(
      `"hair_type_translation": "how this translates onto ${opts.curlType ?? "the user's"} hair - 1-2 sentences max"`
    );
  }

  return `${STYLE_DISAMBIGUATION_GUIDANCE}\n\nReturn ONLY this JSON object, no other text:\n{\n  ${fields.join(",\n  ")}\n}`;
}

type DetectedStyle = {
  style_name: string;
  style_description: string;
  confidence: "high" | "medium" | "low";
  confidence_reason: string | null;
  alternative_style: string | null;
  hair_length: string;
  bang_length: "above-eyebrow" | "at-eyebrow" | "below-eyebrow" | "cheekbone-length" | null;
  requires_fake_hair: boolean;
  fake_hair_type: string | null;
  accessories_visible: string[];
  estimated_time: string;
  difficulty: string;
  compatible_hair_types: string[];
  detected_color?: string | null;
  hair_type_translation?: string | null;
  image_url?: string | null;
};

// Claude sometimes wraps JSON in a ```json ... ``` fence despite being
// told not to - strip that before parsing rather than fail on it.
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
  console.log("[style-match/analyze] ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
  // First 10 chars only - enough to confirm the right key is loaded
  // (e.g. "sk-ant-api...") without exposing the rest in logs.
  console.log("[style-match/analyze] ANTHROPIC_API_KEY prefix:", process.env.ANTHROPIC_API_KEY?.slice(0, 10));

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
  }: {
    input_type?: "photo" | "text";
    image_base64?: string;
    image_media_type?: string;
    text?: string;
    color_match?: boolean;
    translate_for_hair_type?: boolean;
    curl_type?: string | null;
  } = body;

  console.log("[style-match/analyze] Request type:", input_type);

  const analysisInstructions = buildAnalysisInstructions({
    colorMatch: Boolean(color_match),
    translateForHairType: Boolean(translate_for_hair_type),
    curlType: curl_type ?? null,
  });

  let messageContent: unknown[];
  // Kicked off alongside the Anthropic call (not awaited yet) so the
  // upload and the analysis happen concurrently rather than adding to
  // the wait shown in the loading overlay.
  let imageUploadPromise: Promise<string | null> = Promise.resolve(null);

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
      {
        type: "text",
        text: `The user wants this hairstyle: "${text.trim()}". Return the same JSON structure as below based on the described style.\n\n${analysisInstructions}`,
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
        // .trim() guards against a trailing newline/space from pasting
        // the key into Vercel's env var UI - an invalid header value
        // makes fetch() throw before the request is even sent, which
        // otherwise shows up here as an opaque "couldn't reach the
        // service" with no indication it was ever about the key.
        "x-api-key": process.env.ANTHROPIC_API_KEY.trim(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        // Lower than the original 1024 on purpose - this schema is
        // short enough that 1024 was never being used, just giving the
        // model room to ramble. Capping it tighter nudges faster
        // generation too. Bumped from 512 for the disambiguation fields
        // (confidence_reason is a full sentence on top of
        // style_description) - still well under 1024.
        max_tokens: 700,
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
        { error: "Couldn't analyze this style. Please try again.", detail: errorBody },
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
    // JSON.stringify(err) on a real Error yields "{}" (message/stack
    // aren't own-enumerable properties) - log err.message/err.stack
    // explicitly too, or this tells you nothing beyond "something threw."
    console.error("[style-match/analyze] Anthropic API error:", JSON.stringify(err));
    console.error(
      "[style-match/analyze] Anthropic API error message:",
      err instanceof Error ? err.message : String(err)
    );
    if (err instanceof Error && err.stack) {
      console.error("[style-match/analyze] Anthropic API error stack:", err.stack);
    }
    return NextResponse.json(
      {
        error: "Analysis failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
