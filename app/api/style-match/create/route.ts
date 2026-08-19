import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type CreateRequestBody = {
  user_id?: string;
  input_type?: "photo" | "text";
  input_text?: string | null;
  image_url?: string | null;
  detected_style?: string;
  detected_details?: Record<string, unknown>;
  match_mode?: "quick" | "deep";
  color_match?: boolean;
  length_difference?: string | null;
  involves_extensions?: string | null;
  translated_for_hair_type?: boolean;
};

// Creates the style_matches row as soon as a match is confirmed, rather
// than only once the user takes a concluding action (save/book) -- the
// heart/save button on the confirm and results screens needs a real
// style_match_id to attach saved_styles rows to, and that can happen
// before the user has decided DIY vs stylist.
// app/api/style-match/complete/route.ts then UPDATEs this same row once
// results (tutorials/shopping list) and a DIY/stylist choice exist, and
// sends the hey@qoyl.live notification at that point.
export async function POST(request: Request) {
  console.log("[style-match/create] route hit");

  const body: CreateRequestBody = await request.json();
  const {
    user_id,
    input_type,
    input_text,
    image_url,
    detected_style,
    detected_details,
    match_mode,
    color_match,
    length_difference,
    involves_extensions,
    translated_for_hair_type,
  } = body;

  if (!user_id || !input_type || !detected_style) {
    return NextResponse.json(
      { error: "user_id, input_type, and detected_style are required." },
      { status: 400 }
    );
  }

  const { data: row, error } = await getSupabaseAdmin()
    .from("style_matches")
    .insert({
      user_id,
      input_type,
      input_text: input_text ?? null,
      image_url: image_url ?? null,
      detected_style,
      detected_details: detected_details ?? null,
      match_mode: match_mode ?? "quick",
      color_match: Boolean(color_match),
      length_difference: length_difference ?? null,
      involves_extensions: involves_extensions ?? null,
      translated_for_hair_type: Boolean(translated_for_hair_type),
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[style-match/create] Failed to insert style_matches row:", error);
    return NextResponse.json(
      { error: "Couldn't save this style match. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: row.id });
}
