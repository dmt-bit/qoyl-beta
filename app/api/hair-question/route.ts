import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  HAIR_QUESTION_MODEL,
  HAIR_QUESTION_SYSTEM_PROMPT,
  cleanLabel,
  parseModelJson,
  sanitizeRoute,
} from "@/lib/hairQuestion";

// Home page hair Q&A. No login required - anonymous visitors get it too,
// rate limited per browser session. Answers come from Claude (Haiku), and
// every question is logged to ml_events.
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MAX_QUESTION_CHARS = 500;
const MAX_QUESTIONS_PER_HOUR = 10;

const LIMIT_MESSAGE =
  "you've asked a lot of questions this hour - come back in a bit or create a free profile for unlimited access.";

type Body = {
  question?: unknown;
  session_id?: unknown;
  curl_type?: unknown;
  porosity?: unknown;
  city?: unknown;
};

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;

  const question = str(body.question, MAX_QUESTION_CHARS);
  const sessionId = str(body.session_id, 64);
  if (!question || !sessionId || sessionId.length < 8) {
    return NextResponse.json({ error: "question and session_id are required." }, { status: 400 });
  }

  const curlType = str(body.curl_type, 20);
  const porosity = str(body.porosity, 20);
  const city = str(body.city, 60);
  const hasProfile = Boolean(curlType);
  const admin = getSupabaseAdmin();

  // Resolve the signed-in user if a session token was sent (optional).
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  if (token) {
    const { data } = await admin.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  // Rate limit: answered questions per session in the last hour. A count
  // error fails open (the question is answered) and is logged - better to
  // answer than to block everyone when the log table is unavailable.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("ml_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "hair_question")
    .eq("metadata->>session_id", sessionId)
    .gte("created_at", since);
  if (countError) console.error("[hair-question] rate-limit count failed:", countError.message);

  if ((count ?? 0) >= MAX_QUESTIONS_PER_HOUR) {
    await admin.from("ml_events").insert({
      event_type: "hair_question_limited",
      user_id: userId,
      metadata: { session_id: sessionId, question: question.slice(0, MAX_QUESTION_CHARS) },
    });
    return NextResponse.json({ answer: LIMIT_MESSAGE, route: null, route_label: null, intent: "rate_limited" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error("[hair-question] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "Hair questions are unavailable right now." }, { status: 503 });
  }

  const profileLine = `USER PROFILE (if available):\ncurl_type: ${curlType ?? "unknown"}\nporosity: ${porosity ?? "unknown"}\ncity: ${city ?? "unknown"}`;

  let answer: string;
  let intent = "general";
  let routeSuggested: string | null = null;
  let routeLabel: string | null = null;
  let secondaryRoute: string | null = null;
  let secondaryLabel: string | null = null;
  let confidence = "low";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIR_QUESTION_MODEL,
        max_tokens: 300,
        system: `${HAIR_QUESTION_SYSTEM_PROMPT}\n${profileLine}`,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!response.ok) {
      console.error("[hair-question] Anthropic error:", response.status, await response.text());
      throw new Error("anthropic_error");
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const parsed = parseModelJson(text);

    if (parsed && typeof parsed.answer === "string" && parsed.answer.trim()) {
      answer = parsed.answer.trim().slice(0, 600);
      intent = typeof parsed.intent === "string" ? parsed.intent : "general";
      routeSuggested = sanitizeRoute(parsed.route, hasProfile);
      routeLabel = routeSuggested ? cleanLabel(parsed.route_label, "open →") : null;
      secondaryRoute = sanitizeRoute(parsed.secondary_route, hasProfile);
      secondaryLabel = secondaryRoute ? cleanLabel(parsed.secondary_label, "see more →") : null;
      confidence = typeof parsed.confidence === "string" ? parsed.confidence : "low";
    } else {
      // Not valid JSON: show the plain text, routed to search.
      answer = text.trim().slice(0, 300) || "we couldn't answer that one - try searching for a product instead.";
      intent = "general";
      routeSuggested = "/search";
      routeLabel = "search products →";
    }
  } catch {
    answer = "we couldn't answer that right now - try again in a moment.";
    intent = "error";
    confidence = "low";
  }

  // Every question is logged, answered or not - the gap between questions
  // and clicks is the response-quality signal.
  const { error: logError } = await admin.from("ml_events").insert({
    event_type: "hair_question",
    user_id: userId,
    metadata: {
      question: question.slice(0, MAX_QUESTION_CHARS),
      question_length: question.length,
      intent,
      route_suggested: routeSuggested,
      secondary_route: secondaryRoute,
      confidence,
      curl_type: curlType,
      porosity,
      city,
      session_id: sessionId,
      has_profile: hasProfile,
    },
  });
  if (logError) console.error("[hair-question] ml_events insert failed:", logError.message);

  return NextResponse.json({
    answer,
    route: routeSuggested,
    route_label: routeLabel,
    secondary_route: secondaryRoute,
    secondary_label: secondaryLabel,
    intent,
  });
}
