import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { adhesiveMethodsImplyAdhesive, toDbAdhesiveType, toDbRow } from "@/lib/extensionProfiles";

export async function POST(request: Request) {
  const body = await request.json();
  const { id, user_id: userId, ...fields } = body ?? {};

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const adhesiveMethods: string[] = Array.isArray(fields.adhesive_methods) ? fields.adhesive_methods : [];

  const dbQuirkFields = toDbRow({
    extension_texture: fields.extension_texture ?? null,
    scalp_condition: fields.scalp_condition ?? null,
    blend_method: fields.needs_blending ? fields.blend_method ?? null : null,
    leave_out_amount: fields.needs_blending ? fields.leave_out_amount ?? null : null,
    wear_schedule: fields.wear_schedule ?? null,
    natural_porosity: fields.natural_porosity ?? null,
    notes: fields.notes || null,
  });

  const payload = {
    user_id: userId,
    natural_curl_type: fields.natural_curl_type ?? null,
    natural_hair_length: fields.natural_hair_length ?? null,
    extension_types: fields.extension_types ?? [],
    needs_blending: Boolean(fields.needs_blending),
    install_duration_weeks: fields.install_duration_weeks ?? null,
    uses_adhesive: adhesiveMethodsImplyAdhesive(adhesiveMethods),
    adhesive_type: toDbAdhesiveType(adhesiveMethods),
    zip_code: fields.zip_code || null,
    updated_at: new Date().toISOString(),
    ...dbQuirkFields,
  };

  const admin = getSupabaseAdmin();
  const { data, error } = id
    ? await admin
        .from("extension_profiles")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .single()
    : await admin.from("extension_profiles").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
