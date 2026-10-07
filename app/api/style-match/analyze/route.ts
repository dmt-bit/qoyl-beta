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
//
// TODO: evaluate whether to delete the image from storage after analysis.
// Currently retained for the summary document display.
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

TWIST AND CURL STYLES - distinguish carefully:
- twist out: unraveled two-strand twists, defined stretched curl pattern with visible twist lines
- braid out: unraveled braids, similar to twist out but a different wave pattern
- wash and go: natural curl pattern with defining products, no manipulation, no twist/braid definition lines
- finger coils: individually coiled sections using fingers, tighter definition than wash and go
- flexi rod set: uniform spiral curls from flexible rods, very defined
- roller set: uniform curl from rollers

BRAID STYLES - distinguish carefully (root section is the tell for box vs. knotless - see below):
- box braids: individual braids with a visible knot/square section at the root, more tension on the scalp
- knotless braids: feed-in technique, no knot at the root - the root looks flat and clean, starts with natural hair, less scalp tension
- cornrows / feed-in cornrows: braids flat against the scalp in rows
- goddess braids: large chunky braids, often with loose flowing ends
- tribal braids: cornrow patterns that form shapes or designs
- micro braids: very thin individual braids
- senegalese twists: rope twists using straight, smooth extension hair
- passion twists: twists using wavy/water-wave extension hair, bohemian texture
- marley twists: twists using thick, kinky marley hair, very full texture
- spring twists: pre-twisted extension hair with a springy coiled texture
Box braids and knotless braids are the two most commonly confused styles in this list - look specifically at the root: a visible knot/bump means box braids, a flat clean root means knotless.

LOC STYLES - distinguish carefully:
- starter locs / baby locs: real locs just beginning, natural hair coiling into locs (not extension hair)
- traditional locs: mature, established real locs
- sisterlocks: very thin, uniform real locs created with a specific tool
- faux locs: temporary locs using extension hair, wrapped or crocheted, can be removed
- butterfly locs: soft, wavy faux locs with a looped/distressed texture at the ends
- boho faux locs: faux locs with loose curly extension hair woven in throughout
Starter/traditional/sisterlocks are REAL locs on the person's own hair (permanent, grows over time). Faux/butterfly/boho are extension-hair locs (temporary, can be taken out).

CUTS - identify when the photo shows a haircut rather than a styling technique on existing hair:
- pixie cut: short all over, typically under 3 inches
- bob: chin length or above, blunt or layered
- lob (long bob): chin to collarbone length
- shag: layered cut with curtain bangs and heavy texturizing throughout
- wolf cut: shag-inspired with heavy layers and volume concentrated at the crown
A cut changes the hair's actual length via scissors, not just how existing length is styled - if what's shown could only be achieved by cutting hair (not detangling/curling/braiding it), this is a cut.

COLOR - note when a color service (not just the cut/style) is part of what's shown:
color_type options: balayage, highlights, ombre, sombre, single_process, color_melt, money_piece, vivid_color, natural (no color treatment visible)

FACE SHAPE DETECTION:
If a face is clearly visible in the image, identify the face shape:
- oval: forehead slightly wider than jaw, face length ~1.5x width
- round: similar width and length, soft curved jawline
- square: strong jaw, similar width at forehead and jaw
- heart: wider forehead, narrow chin
- diamond: narrow forehead and jaw, wide cheekbones
- oblong: longer than wide, similar width throughout
If this is an inspiration photo (hair from behind, celebrity photo, or no face visible) return "unknown". Never guess - "unknown" is correct when uncertain.

NATURAL HAIR COLOR:
Describe the visible hair color in plain language.
Focus on the natural hair, not extensions or wig color if those are clearly artificial.
If the person is wearing a wig or extensions, describe what you can see of their natural hair if visible, otherwise null.`;

// Shortened deliberately - fewer/shorter fields means less output for
// the model to generate, which is a direct, significant chunk of total
// response time. current_to_desired_translation/length_gap/prep_needed
// used to live here too, but that meant every request with a current
// hair photo attached the photo AND asked for more output in the same
// call. That's now a separate, tiny, image-free follow-up call fired
// after this one returns - see app/api/style-match/translate/route.ts.
// confidence/confidence_reason/alternative_style/bang_length/
// style_is_cut/has_color_treatment/color_type/loc_type/braid_type/
// is_protective_style/approximate_length are the disambiguation feature
// - every one of them is a boolean, single enum word, or null (never a
// full sentence except confidence_reason) specifically so 11 extra
// fields doesn't blow up generation time the way 11 extra sentences
// would.
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
    `"approximate_length": "twa/short/medium/long/waist/hip"`,
    `"bang_length": "above-eyebrow/at-eyebrow/below-eyebrow/cheekbone-length - only if bangs are visible, else null"`,
    `"style_is_cut": true/false - true only if this is a haircut (pixie/bob/lob/shag/wolf cut), not a styling technique on existing length`,
    `"has_color_treatment": true/false`,
    `"color_type": "balayage/highlights/ombre/sombre/single_process/color_melt/money_piece/vivid_color/natural - natural if has_color_treatment is false"`,
    `"loc_type": "starter/traditional/sisterlocks/faux/butterfly/boho - only if locs are visible, else null"`,
    `"braid_type": "box/knotless/cornrow/goddess/tribal/micro/senegalese-twist/passion-twist/marley-twist/spring-twist - only if braids/twists using this technique are visible, else null"`,
    `"is_protective_style": true/false - true for any braid/twist/loc/wig/weave style`,
    `"requires_fake_hair": true/false`,
    `"fake_hair_type": "type or null"`,
    `"accessories_visible": []`,
    `"estimated_time": "X hours"`,
    `"difficulty": "beginner/intermediate/advanced"`,
    `"compatible_hair_types": []`,
    `"face_shape": "oval/round/square/heart/diamond/oblong/unknown - detect from the photo if a face is visible; unknown if no face is visible or confidence is too low"`,
    `"natural_hair_color": "plain text description (e.g. 'dark brown', 'medium blonde', 'black', 'light auburn') of the person's natural/current hair color - used to match fake hair color to their natural hair - or null if no hair is visible or it can't be determined"`,
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

type LocType = "starter" | "traditional" | "sisterlocks" | "faux" | "butterfly" | "boho";
type BraidType =
  | "box"
  | "knotless"
  | "cornrow"
  | "goddess"
  | "tribal"
  | "micro"
  | "senegalese-twist"
  | "passion-twist"
  | "marley-twist"
  | "spring-twist";
type ApproximateLength = "twa" | "short" | "medium" | "long" | "waist" | "hip";
type FaceShape = "oval" | "round" | "square" | "heart" | "diamond" | "oblong" | "unknown";

type DetectedStyle = {
  style_name: string;
  style_description: string;
  confidence: "high" | "medium" | "low";
  confidence_reason: string | null;
  alternative_style: string | null;
  hair_length: string;
  approximate_length: ApproximateLength;
  bang_length: "above-eyebrow" | "at-eyebrow" | "below-eyebrow" | "cheekbone-length" | null;
  style_is_cut: boolean;
  has_color_treatment: boolean;
  color_type: string;
  loc_type: LocType | null;
  braid_type: BraidType | null;
  is_protective_style: boolean;
  requires_fake_hair: boolean;
  fake_hair_type: string | null;
  accessories_visible: string[];
  estimated_time: string;
  difficulty: string;
  compatible_hair_types: string[];
  face_shape?: FaceShape | null;
  natural_hair_color?: string | null;
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
        // generation too. Bumped 512 -> 700 for the first disambiguation
        // round (confidence_reason is a full sentence), then -> 900 for
        // the cut/color/loc/braid/length fields - those are all
        // booleans/short enums, not sentences, so the per-field cost is
        // much smaller than confidence_reason's was; still under 1024.
        max_tokens: 900,
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
