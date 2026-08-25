import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateChildRoutineSteps } from "@/lib/childRoutineSteps";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { data: profile } = await getSupabaseAdmin()
    .from("child_profiles")
    .select("id, name, curl_type, cooperative_level, heat_tools_used, sensory_sensitive")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Child profile not found." }, { status: 404 });
  }

  const routine = generateChildRoutineSteps(profile);

  return NextResponse.json({
    name: profile.name,
    ...routine,
  });
}
