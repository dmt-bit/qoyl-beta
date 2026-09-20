import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { ratingForScore } from "@/lib/compatibility";

// Saves a primary_function tag for one ingredient plus the three
// low/medium/high compatibility_scores rows that go with it (admin-entered
// defaults, editable before saving) - the "ingredient entry form" flow from
// the request, built fresh since no per-ingredient admin UI existed before
// this (see app/admin/products/page.tsx's Coverage tab).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    primary_function,
    scores,
  }: { primary_function?: string; scores?: { low: number; medium: number; high: number } } = body;

  if (!primary_function || !scores) {
    return NextResponse.json({ error: "primary_function and scores are required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { error: updateError } = await admin
    .from("ingredients")
    .update({ primary_function })
    .eq("id", params.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: existingRows } = await admin
    .from("compatibility_scores")
    .select("porosity")
    .eq("ingredient_id", params.id)
    .is("hair_type", null)
    .is("scalp_condition", null)
    .is("thickness", null);
  const existingPorosities = new Set((existingRows ?? []).map((r) => r.porosity));

  const rowsToInsert = (["low", "medium", "high"] as const)
    .filter((porosity) => !existingPorosities.has(porosity))
    .map((porosity) => ({
      ingredient_id: params.id,
      porosity,
      score: scores[porosity],
      rating: ratingForScore(scores[porosity]),
      reason: `Manually tagged via admin (function: ${primary_function}).`,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await admin.from("compatibility_scores").insert(rowsToInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ rowsInserted: rowsToInsert.length, skipped: 3 - rowsToInsert.length });
}
