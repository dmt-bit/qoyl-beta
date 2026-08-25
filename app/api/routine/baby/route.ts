import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateBabyRoutineSteps } from "@/lib/babyRoutineSteps";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { data: profile } = await getSupabaseAdmin()
    .from("baby_profiles")
    .select("id, name, hair_texture, scalp_condition, wash_frequency_preference")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Baby profile not found." }, { status: 404 });
  }

  const routine = generateBabyRoutineSteps(profile);

  return NextResponse.json({
    name: profile.name,
    ...routine,
  });
}
