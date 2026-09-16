import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: images, error } = await getSupabaseAdmin()
    .from("visual_library")
    .select("id, image_url, alt_text, hair_types, categories, mood, card_types, is_active, used_count, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: images ?? [] });
}

type CreateBody = {
  image_url?: string;
  alt_text?: string | null;
  hair_types?: string[];
  categories?: string[];
  mood?: string | null;
  card_types?: string[];
};

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body: CreateBody = await request.json();
  const imageUrl = body.image_url?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: "image_url is required." }, { status: 400 });
  }

  const { data: image, error } = await getSupabaseAdmin()
    .from("visual_library")
    .insert({
      image_url: imageUrl,
      alt_text: body.alt_text?.trim() || null,
      hair_types: body.hair_types ?? [],
      categories: body.categories ?? [],
      mood: body.mood || null,
      card_types: body.card_types ?? [],
    })
    .select("id, image_url, alt_text, hair_types, categories, mood, card_types, is_active, used_count, created_at")
    .single();

  if (error || !image) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to add image." },
      { status: 500 }
    );
  }

  return NextResponse.json({ image });
}
