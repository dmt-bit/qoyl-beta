import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { buildScoreReport } from "@/lib/scoreReport";

// Server-to-server bridge for qoyl-business's brand score report (the
// admin approval flow). Not for browsers: it's gated by a shared key
// (QOYL_INTERNAL_API_KEY, set in both projects) and returns the score
// matrix for a catalog product. Same key check for every request - a
// missing or wrong key gets 401 and nothing else.
function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.QOYL_INTERNAL_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Internal API key not configured." }, { status: 503 });
  }
  if (!keyMatches(request.headers.get("x-internal-key"), expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const productName = typeof body.productName === "string" ? body.productName : "";
  const brandName = typeof body.brandName === "string" && body.brandName.trim() ? body.brandName : null;
  if (!productName.trim()) {
    return NextResponse.json({ error: "productName is required." }, { status: 400 });
  }

  try {
    const report = await buildScoreReport(productName, brandName);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[score-report] failed:", error);
    return NextResponse.json({ error: "Score report failed." }, { status: 500 });
  }
}
