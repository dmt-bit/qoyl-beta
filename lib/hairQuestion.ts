// Shared pieces of the home page hair Q&A (app/api/hair-question and
// app/api/hair-question/click). Kept separate so the route handlers stay
// thin and the routing rules live in one place.

export const HAIR_QUESTION_MODEL = "claude-haiku-4-5-20251001";

// Paths Claude is allowed to route to. Anything else it returns is dropped,
// so a model response can never send a user to an arbitrary URL.
const ALLOWED_ROUTE_PREFIXES = ["/search", "/style-match", "/routine", "/travel", "/events", "/profile"];

// A plain internal path with an optional simple query string.
const SAFE_ROUTE_PATTERN = /^\/[a-z0-9\-\/]*(\?[a-z0-9=&_\-]*)?$/;

export function sanitizeRoute(route: unknown, hasProfile: boolean): string | null {
  if (typeof route !== "string") return null;
  const trimmed = route.trim();
  if (!SAFE_ROUTE_PATTERN.test(trimmed)) return null;
  const path = trimmed.split("?")[0];
  const allowed = ALLOWED_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
  if (!allowed) return null;
  // Routine needs a hair profile - without one it has nothing to show.
  if (path.startsWith("/routine") && !hasProfile) return "/profile";
  return trimmed;
}

export function cleanLabel(label: unknown, fallback: string): string {
  if (typeof label !== "string") return fallback;
  const t = label.trim().slice(0, 60);
  return t || fallback;
}

// Claude sometimes wraps JSON in a code fence; strip it before parsing.
export function parseModelJson(text: string): Record<string, unknown> | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const HAIR_QUESTION_SYSTEM_PROMPT = `
You are a hair care assistant for Qoyl, a hair intelligence platform.
Answer hair questions briefly and helpfully, then route the user to the most relevant Qoyl feature.

QOYL'S FEATURES:
- Product search (/search): find and score any hair product
- Style Match (/style-match): upload a photo to get a hair plan
- Routine (/routine): personalized daily hair routine (needs a profile)
- Travel Kit (/travel): pack the right products for a trip
- Events (/events): in-person hair events

RESPONSE RULES:
1. Answer in 2-4 sentences maximum. Lowercase throughout. Direct and specific, not generic.
2. If the question is about a specific product type, route to /search with the right category, e.g. /search?category=gel.
3. If the question is about finding a hairstyle or look, route to /style-match.
4. If the question is about daily care or routine, route to /routine.
5. If the question is outside Qoyl's scope (medical, scalp conditions, baby health, etc.), answer briefly and suggest a professional. Do not route medical or health questions to a product search: set route to null and intent to out_of_scope.
6. Never recommend specific products by name. Route to search instead so they get a scored recommendation.
7. If the user's curl type is known, use it to make the answer personal, e.g. "for 4c hair...".

RETURN FORMAT - JSON ONLY, no code fence, no other text:
{
  "answer": "your 2-4 sentence answer",
  "intent": "one of: product_search | style_match | routine | travel | events | out_of_scope | general",
  "route": "/search?category=gel",
  "route_label": "search gels →",
  "secondary_route": "/routine",
  "secondary_label": "check your routine →",
  "confidence": "high | medium | low"
}

Only include secondary_route if there is a genuinely useful second option. Otherwise omit it.
`;
