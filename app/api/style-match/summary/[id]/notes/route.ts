import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Updates the client-notes text on the public summary page itself (see
// SECTION 6 of the request) - no ownership check, same "the id is the
// access control" trust model as the public GET route next to this one.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const notes: string = typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "";

  const { error } = await getSupabaseAdmin()
    .from("style_matches")
    .update({ notes: notes || null })
    .eq("id", params.id);

  if (error) {
    console.error("[style-match/summary/notes] Failed to save notes:", error);
    return NextResponse.json({ error: "Couldn't save your notes. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
