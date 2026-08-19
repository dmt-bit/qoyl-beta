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
//
// Deliberately plain text, not JSON -- a single required sentence needs
// no structure to parse, and one less thing that can fail (malformed
// JSON) on the call that's supposed to be the fast, simple one. This
// also means the length_gap chip / prep_needed checklist the results
// screen can render (from an older style_matches row, or if this route
// changes again later) just won't be populated by new matches going
// forward -- that's an intentional simplification, not an oversight.
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

  const hairDescription = [curl_type, porosity].filter(Boolean).join(" ") || "an unspecified hair type";
  const prompt = `The user has ${hairDescription} hair and wants to achieve: ${style_name}. In exactly one sentence, describe what achieving this style would take starting from their hair type.`;

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
        max_tokens: 150,
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

    return NextResponse.json({ current_to_desired_translation: rawText.trim() });
  } catch (err) {
    console.error(
      "[style-match/translate] Failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}
