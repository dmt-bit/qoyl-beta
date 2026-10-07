import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type CreateRequestBody = {
  user_id?: string;
  input_type?: "photo" | "text";
  input_text?: string | null;
  image_url?: string | null;
  detected_style?: string;
  detected_details?: Record<string, unknown>;
  face_shape?: string | null;
  natural_hair_color?: string | null;
  match_mode?: "quick" | "deep";
  color_match?: boolean;
  length_difference?: string | null;
  involves_extensions?: string | null;
  hair_addition_preference?: string | null;
  translated_for_hair_type?: boolean;
};

// Creates the style_matches row as soon as a match is confirmed, rather
// than only once the user takes a concluding action (save/book) - the
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
    face_shape,
    natural_hair_color,
    match_mode,
    color_match,
    length_difference,
    involves_extensions,
    hair_addition_preference,
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
      face_shape: face_shape ?? null,
      natural_hair_color: natural_hair_color ?? null,
      match_mode: match_mode ?? "quick",
      color_match: Boolean(color_match),
      length_difference: length_difference ?? null,
      involves_extensions: involves_extensions ?? null,
      hair_addition_preference: hair_addition_preference ?? null,
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

  // One-time hair_profiles writes from this photo's analysis - IS NULL so a
  // later photo never overwrites an earlier confirmed value. Best-effort:
  // a failure here must not fail the match that was already saved above.
  //
  // input_type === "photo" is the closest this app has to "a selfie was
  // analyzed" - there is no actual selfie flow. The only upload entry
  // point on this page is "a picture of the style you want," which is
  // very often someone else's hair/face (a model, a Pinterest photo), not
  // the user's own. This can write a stranger's face shape or hair color
  // onto the user's profile when the uploaded photo isn't of them.
  // Implemented this way as a product decision made during this change.
  if (input_type === "photo") {
    const admin = getSupabaseAdmin();
    if (face_shape && face_shape !== "unknown") {
      const { error: faceShapeError } = await admin
        .from("hair_profiles")
        .update({ face_shape })
        .eq("user_id", user_id)
        .is("face_shape", null);
      if (faceShapeError) {
        console.error("[style-match/create] face_shape update failed:", faceShapeError.message);
      }
    }
    if (natural_hair_color) {
      const { error: colorError } = await admin
        .from("hair_profiles")
        .update({ natural_hair_color })
        .eq("user_id", user_id)
        .is("natural_hair_color", null);
      if (colorError) {
        console.error("[style-match/create] natural_hair_color update failed:", colorError.message);
      }
    }
  }

  return NextResponse.json({ id: row.id });
}
