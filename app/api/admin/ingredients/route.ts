import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

// Full ingredient list (id, inci_name, primary_function) for the
// search-and-tag tool on the Coverage tab (app/admin/products/page.tsx).
// ~850 rows today - already close to PostgREST's 1000-row unpaginated cap
// (which silently truncated a similar full-table read elsewhere and caused
// a real bug - see lib/ingredientScoring.ts), so this pages through rather
// than risk the same truncation once ingredient count crosses 1000.
export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  type Row = { id: string; inci_name: string; common_name: string | null; primary_function: string | null };
  let all: Row[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from("ingredients")
      .select("id, inci_name, common_name, primary_function")
      .order("inci_name")
      .range(from, from + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    all = all.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return NextResponse.json({ ingredients: all });
}
