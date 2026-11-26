import { NextResponse } from "next/server";

// GET /api/style-match/guide?video_id=<id>&style_name=<name>&curl_type=<type>
//
// 1. Fetches the YouTube video's snippet (title, description) and
//    contentDetails (chapters, if the creator added them).
// 2. Passes that data + style context to Claude to generate a clean
//    numbered step-by-step guide the user can follow.
// 3. Returns { steps: [{step, description}], source, videoTitle }.
//
// Steps are generated fresh per request (no caching here) since the
// population of styled videos is large. Add a Supabase cache later
// if API costs become a concern.

export type StyleGuideStep = {
  step: number;
  title: string;
  description: string;
};

export type StyleGuideResult = {
  steps: StyleGuideStep[];
  source: "chapters" | "ai_generated";
  videoTitle: string;
};

type YouTubeChapter = {
  time: string;
  title: string;
};

function parseDescriptionForSteps(description: string): string[] {
  // Look for timestamped chapters: "0:00 Intro", "1:30 Section prep", etc.
  const timestampLines = description
    .split("\n")
    .filter((line) => /^\d+:\d{2}/.test(line.trim()))
    .map((line) => line.trim().replace(/^\d+:\d{2}:?\d*\s*[-–—]?\s*/, "").trim())
    .filter((title) => title.length > 0 && title.length < 80);

  if (timestampLines.length >= 3) return timestampLines;

  // Look for numbered steps: "1. Do this", "Step 1:", etc.
  const numberedLines = description
    .split("\n")
    .filter((line) => /^(step\s*)?[1-9]\d?[.):]\s+/i.test(line.trim()))
    .map((line) => line.replace(/^(step\s*)?[1-9]\d?[.):]\s+/i, "").trim())
    .filter((title) => title.length > 0 && title.length < 120);

  return numberedLines;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("video_id");
  const styleName = searchParams.get("style_name") ?? "this style";
  const curlType = searchParams.get("curl_type") ?? null;
  const installType = searchParams.get("install_type") ?? null;

  if (!videoId) {
    return NextResponse.json({ error: "video_id is required." }, { status: 400 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "YouTube API not configured." }, { status: 503 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  // --- Step 1: fetch video details from YouTube -------------------------
  const ytUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  ytUrl.searchParams.set("part", "snippet,contentDetails");
  ytUrl.searchParams.set("id", videoId);
  ytUrl.searchParams.set("key", process.env.YOUTUBE_API_KEY);

  let videoTitle = "Tutorial";
  let videoDescription = "";
  let chapters: YouTubeChapter[] = [];

  try {
    const ytRes = await fetch(ytUrl.toString());
    if (ytRes.ok) {
      const ytData = await ytRes.json();
      const item = ytData.items?.[0];
      if (item) {
        videoTitle = item.snippet?.title ?? "Tutorial";
        videoDescription = item.snippet?.description ?? "";

        // YouTube chapters come through the description, not contentDetails.
        // The API doesn't expose chapter data directly — we parse from
        // the description instead.
        const parsedChapters = parseDescriptionForSteps(videoDescription);
        if (parsedChapters.length >= 3) {
          chapters = parsedChapters.slice(0, 12).map((title) => ({ time: "", title }));
        }
      }
    }
  } catch (err) {
    console.error("[style-match/guide] YouTube fetch failed:", err);
    // Non-fatal — fall through to AI generation with empty description
  }

  // --- Step 2: generate steps with Claude --------------------------------
  const contextParts: string[] = [
    `Style: ${styleName}`,
    curlType ? `User's curl type: ${curlType}` : "",
    installType ? `Install method: ${installType}` : "",
    `Video title: ${videoTitle}`,
  ].filter(Boolean);

  const descriptionSection =
    videoDescription.length > 100
      ? `\nVideo description (first 1500 chars):\n${videoDescription.slice(0, 1500)}`
      : "";

  const chaptersSection =
    chapters.length > 0
      ? `\nChapters/sections detected:\n${chapters.map((c, i) => `${i + 1}. ${c.title}`).join("\n")}`
      : "";

  const prompt = `You are a hair care expert writing a step-by-step guide for someone doing ${styleName} at home.

${contextParts.join("\n")}
${descriptionSection}
${chaptersSection}

Write a clear, practical step-by-step guide (5 to 8 steps) someone can follow to achieve this style.
${curlType ? `Tailor the advice to ${curlType} hair.` : ""}
${installType ? `Focus on the ${installType} install method.` : ""}

Rules:
- Each step has a short title (3-6 words) and a 1-2 sentence description of what to do.
- Be specific and actionable. No vague advice.
- If the video description or chapters provided useful info, incorporate it.
- Do NOT start step titles with "Step 1:", just write the action title.
- Do NOT include intro/outro steps like "Watch the video" or "Enjoy your style".

Respond with ONLY a JSON array, no markdown, no commentary:
[
  { "step": 1, "title": "Prep and detangle", "description": "Start on clean, slightly damp hair. Use a wide-tooth comb to detangle fully from ends to roots before beginning." },
  ...
]`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error("[style-match/guide] Anthropic API error:", aiRes.status, errBody);
      return NextResponse.json({ error: "Failed to generate guide." }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const rawText: string =
      aiData.content?.[0]?.type === "text" ? (aiData.content[0].text as string).trim() : "";

    // Strip markdown code fences if Claude wrapped it
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let steps: StyleGuideStep[];
    try {
      steps = JSON.parse(jsonText);
      if (!Array.isArray(steps)) throw new Error("not an array");
      // Validate shape
      steps = steps
        .filter((s) => typeof s.step === "number" && s.title && s.description)
        .slice(0, 10);
    } catch {
      console.error("[style-match/guide] Failed to parse Claude response:", rawText.slice(0, 200));
      return NextResponse.json({ error: "Failed to generate guide." }, { status: 500 });
    }

    const result: StyleGuideResult = {
      steps,
      source: chapters.length >= 3 ? "chapters" : "ai_generated",
      videoTitle,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[style-match/guide] Claude call failed:", err);
    return NextResponse.json({ error: "Failed to generate guide." }, { status: 500 });
  }
}
