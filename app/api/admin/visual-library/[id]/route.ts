import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body: {
    is_active?: boolean;
    hair_types?: string[];
    categories?: string[];
    alt_text?: string | null;
  } = await request.json();

  // Build update payload from whichever fields were sent
  const update: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (Array.isArray(body.hair_types)) update.hair_types = body.hair_types;
  if (Array.isArray(body.categories)) update.categories = body.categories;
  if ("alt_text" in body) update.alt_text = body.alt_text ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("visual_library")
    .update(update)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await getSupabaseAdmin().from("visual_library").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
