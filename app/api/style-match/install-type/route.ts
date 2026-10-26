import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { INSTALL_TYPE_OPTIONS } from "@/lib/installTypes";

type Body = { match_id?: string; install_type?: string };

const VALID_VALUES = new Set(INSTALL_TYPE_OPTIONS.map((o) => o.value));

// Persists the answer to "how do you want to install this look?" onto the
// style_matches row created earlier by /api/style-match/create, so it flows
// through to the shareable summary (lib/styleMatchSummary.ts).
export async function POST(request: Request) {
  const body: Body = await request.json();
  const { match_id, install_type } = body;

  if (!match_id || !install_type || !VALID_VALUES.has(install_type as never)) {
    return NextResponse.json({ error: "match_id and a valid install_type are required." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("style_matches")
    .update({ install_type })
    .eq("id", match_id);

  if (error) {
    console.error("[style-match/install-type] update failed:", error.message);
    return NextResponse.json({ error: "Couldn't save your install preference." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
