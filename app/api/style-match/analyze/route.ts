import { NextResponse } from "next/server";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const ANALYSIS_INSTRUCTIONS = `Analyze this hairstyle image and return a JSON object with these exact fields:
{
  "style_name": "name of the hairstyle (e.g. Box Braids, Wash and Go, Twist Out, Knotless Braids, Locs, Bantu Knots, etc)",
  "style_description": "2 sentence description of what this style is",
  "hair_length": "short/medium/long",
  "requires_fake_hair": true/false,
  "fake_hair_type": "type of fake hair needed if any (e.g. braiding hair, crochet hair, lace front wig) or null",
  "accessories_visible": ["list of accessories visible like beads, bands, ribbons, clips"],
  "estimated_time": "how long this style typically takes",
  "difficulty": "beginner/intermediate/advanced",
  "compatible_hair_types": ["array of curl types this style works for e.g. 3c, 4a, 4b, 4c"],
  "maintenance_tips": "one sentence on maintaining this style"
}
Return ONLY the JSON object, no other text.`;

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
  }: {
    input_type?: "photo" | "text";
    image_base64?: string;
    image_media_type?: string;
    text?: string;
  } = body;

  let messageContent: unknown[];

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
        text: ANALYSIS_INSTRUCTIONS,
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
        text: `The user wants this hairstyle: "${text.trim()}". Return the same JSON structure as below based on the described style.\n\n${ANALYSIS_INSTRUCTIONS}`,
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

    console.log("[style-match/analyze] detected style:", detected.style_name);
    return NextResponse.json(detected);
  } catch (err) {
    console.error("[style-match/analyze] Failed to reach Anthropic API:", err);
    return NextResponse.json(
      { error: "Couldn't reach the style analysis service. Please try again." },
      { status: 500 }
    );
  }
}
