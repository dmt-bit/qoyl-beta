import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

// The "current hair -> desired style" translation, split out of the
// main analyze call (see app/api/style-match/analyze/route.ts) so the
// user sees results in one fast, image-only call, and this tiny,
// image-free follow-up fills in the translation afterward without
// holding up the initial response. Client fires this only when the user
// has a hair photo on file (app/style-match/page.tsx).
export async function POST(request: Request) {
  console.log("[style-match/translate] route hit");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[style-match/translate] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const body = await request.json();
  const {
    style_name,
    curl_type,
    porosity,
  }: {
    style_name?: string;
    curl_type?: string | null;
    porosity?: string | null;
  } = body;

  if (!style_name) {
    return NextResponse.json({ error: "style_name is required." }, { status: 400 });
  }

  const hairDescription = [curl_type, porosity && `${porosity} porosity`]
    .filter(Boolean)
    .join(", ") || "an unspecified hair type";

  const prompt = `Given this desired style "${style_name}" and the user has ${hairDescription} hair, what would the translation look like? Answer in 2 sentences max.\nReturn ONLY this JSON, no other text:\n{\n  "current_to_desired_translation": "2 sentences max",\n  "length_gap": "none/slight/moderate/significant",\n  "prep_needed": ["max 3 short items"]\n}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY.trim(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 250,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[style-match/translate] Anthropic API error:", response.status, errorBody);
      return NextResponse.json({ error: "Translation failed." }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text;
    if (typeof rawText !== "string") {
      return NextResponse.json({ error: "Translation failed." }, { status: 502 });
    }

    const stripped = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(stripped);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(
      "[style-match/translate] Failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}
