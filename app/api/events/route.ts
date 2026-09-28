import { NextResponse } from "next/server";
import { getPublicEvents } from "@/lib/events";

// Public read - the actual /events page queries lib/events.ts directly
// (matching this app's existing convention for public pages, e.g.
// app/posts/page.tsx querying Supabase straight from the Server
// Component) rather than fetching this route itself. This route exists
// as its own standalone public endpoint per the request, for any future
// external/client-side consumer.
export async function GET() {
  const events = await getPublicEvents();
  return NextResponse.json({ events });
}
