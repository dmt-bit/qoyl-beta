import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const { id, user_id: userId, ...fields } = body ?? {};

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const usesProtectiveStyles = Boolean(fields.uses_protective_styles);

  const payload = {
    user_id: userId,
    name: fields.name || null,
    age_range: fields.age_range ?? null,
    curl_type: fields.curl_type ?? null,
    hair_density: fields.hair_density ?? null,
    scalp_condition: fields.scalp_condition ?? null,
    hair_concerns: fields.hair_concerns ?? [],
    wash_frequency: fields.wash_frequency ?? null,
    cooperative_level: fields.cooperative_level ?? null,
    sensory_sensitive: Boolean(fields.sensory_sensitive),
    uses_protective_styles: usesProtectiveStyles,
    protective_styles_use_extensions: usesProtectiveStyles
      ? Boolean(fields.protective_styles_use_extensions)
      : null,
    heat_tools_used: Boolean(fields.heat_tools_used),
    zip_code: fields.zip_code || null,
    climate: fields.climate ?? null,
    water_hardness: fields.water_hardness ?? null,
    notes: fields.notes || null,
    updated_at: new Date().toISOString(),
  };

  const admin = getSupabaseAdmin();
  const { data, error } = id
    ? await admin.from("child_profiles").update(payload).eq("id", id).eq("user_id", userId).select("id").single()
    : await admin.from("child_profiles").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
