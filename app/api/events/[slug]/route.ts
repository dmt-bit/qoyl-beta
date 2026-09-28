import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const event = await getEventBySlug(params.slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json({ event });
}
