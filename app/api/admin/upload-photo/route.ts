import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Temporary endpoint for uploading curl-type reference photos.
// Accepts multipart/form-data with fields: file (image), filename (string).
// Protected with admin password.
// TODO: remove this route after initial upload is complete.
export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const filename = (formData.get("filename") as string | null)?.trim();

  if (!file || !filename) {
    return NextResponse.json(
      { error: "file and filename are required." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const supabase = getSupabaseAdmin();

  // Upload to media bucket under curl-type-photos/ folder (correct path, no double-media).
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(`curl-type-photos/${filename}`, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("media")
    .getPublicUrl(`curl-type-photos/${filename}`);

  return NextResponse.json({ url: urlData.publicUrl });
}
