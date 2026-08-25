import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Service-role insert/update per the spec's "insert into baby_profiles
// using service role" - same server-side-bridge shape as app/api/routine/
// route.ts: trusts the client-supplied user_id rather than verifying a
// session JWT, matching the existing pattern used across this app's API
// routes (see supabaseAdmin.ts usage report).
export async function POST(request: Request) {
  const body = await request.json();
  const { id, user_id: userId, ...fields } = body ?? {};

  if (!userId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  const payload = {
    user_id: userId,
    name: fields.name || null,
    age_range: fields.age_range ?? null,
    hair_texture: fields.hair_texture ?? null,
    hair_density: fields.hair_density ?? null,
    scalp_condition: fields.scalp_condition ?? null,
    allergies_notes: fields.allergies_notes || null,
    wash_frequency_preference: fields.wash_frequency_preference ?? null,
    sensory_sensitive: Boolean(fields.sensory_sensitive),
    notes: fields.notes || null,
    updated_at: new Date().toISOString(),
  };

  const admin = getSupabaseAdmin();
  const { data, error } = id
    ? await admin.from("baby_profiles").update(payload).eq("id", id).eq("user_id", userId).select("id").single()
    : await admin.from("baby_profiles").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
