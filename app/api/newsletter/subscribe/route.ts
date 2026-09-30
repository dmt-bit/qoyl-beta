import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Beehiiv-backed newsletter signup (components/NewsletterSignup.tsx, used
// by the shared Footer on every page including the new home page's
// "the qoyl feed" section). BEEHIIV_API_KEY/BEEHIIV_PUBLICATION_ID don't
// exist anywhere in this project's env vars yet - this calls the real
// Beehiiv API exactly as specified, so it starts working the moment
// those are added to the deployment; until then it returns a clean
// error rather than crashing. (A previous turn built a
// newsletter_subscribers table + upsert as the "no Beehiiv credentials"
// fallback - supabase/create_newsletter_subscribers.sql, left in place
// but no longer used by this route, since this request asks for the
// real Beehiiv integration specifically.)
export async function POST(request: Request) {
  const body = await request.json();
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Could not subscribe" }, { status: 400 });
  }

  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    console.error("[newsletter/subscribe] missing BEEHIIV_API_KEY/BEEHIIV_PUBLICATION_ID");
    return NextResponse.json({ error: "Could not subscribe" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, reactivate_existing: true }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[newsletter/subscribe] Beehiiv error:", res.status, detail);
      return NextResponse.json({ error: "Could not subscribe" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[newsletter/subscribe] Beehiiv request failed:", err);
    return NextResponse.json({ error: "Could not subscribe" }, { status: 502 });
  }
}
