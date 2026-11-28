import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { TOOLS_CATALOG } from "@/lib/toolsData";

// Admin API for managing tool catalog overrides stored in `tool_images`.
// The table stores per-tool image_url and amazon_search overrides that
// take precedence over the static values in lib/toolsData.ts, so the
// admin can update them from the UI without a code deploy.
//
// Table DDL (run once in Supabase SQL editor):
//   create table if not exists tool_images (
//     tool_id text primary key,
//     image_url text,
//     amazon_search text,
//     updated_at timestamptz default now()
//   );

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: overrides } = await admin
    .from("tool_images")
    .select("tool_id, image_url, amazon_search");

  const overrideMap = new Map(
    (overrides ?? []).map((r: { tool_id: string; image_url: string | null; amazon_search: string | null }) => [r.tool_id, r])
  );

  // Merge static catalog with DB overrides
  const tools = TOOLS_CATALOG.map((t) => {
    const override = overrideMap.get(t.id);
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      priority: t.priority,
      hair_families: t.hair_families,
      price_range: t.price_range,
      amazon_search: override?.amazon_search ?? t.amazon_search,
      image_url: override?.image_url ?? t.image_url ?? null,
    };
  });

  return NextResponse.json({ tools });
}

export async function PATCH(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { tool_id, image_url, amazon_search } = body ?? {};

  if (!tool_id || typeof tool_id !== "string") {
    return NextResponse.json({ error: "tool_id is required." }, { status: 400 });
  }

  // Validate that it's a known tool
  const known = TOOLS_CATALOG.find((t) => t.id === tool_id);
  if (!known) {
    return NextResponse.json({ error: `Unknown tool: ${tool_id}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const patch: Record<string, string | null> = { tool_id };
  if (image_url !== undefined) patch.image_url = image_url ?? null;
  if (amazon_search !== undefined) patch.amazon_search = amazon_search ?? null;
  patch.updated_at = new Date().toISOString();

  const { error } = await admin
    .from("tool_images")
    .upsert(patch, { onConflict: "tool_id" });

  if (error) {
    // If the table doesn't exist yet, return a helpful message
    if (error.code === "42P01") {
      return NextResponse.json(
        {
          error:
            "The tool_images table does not exist. Run this in Supabase SQL editor:\n\ncreate table if not exists tool_images (\n  tool_id text primary key,\n  image_url text,\n  amazon_search text,\n  updated_at timestamptz default now()\n);",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
