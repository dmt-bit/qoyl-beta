import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { generateUniqueEventSlug } from "@/lib/events";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: event, error } = await getSupabaseAdmin()
    .from("events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const admin = getSupabaseAdmin();

  // Only fields the caller actually sent get touched - lets the edit
  // form (or a quick "publish"/"unpublish" action) send a partial body
  // without clobbering everything else back to its old value.
  const updates: Record<string, unknown> = {};
  const fields = [
    "title", "description", "short_description", "event_date", "event_end_date",
    "location_name", "location_address", "location_city", "is_virtual", "virtual_link",
    "cover_image_url", "ticket_price_cents", "stripe_payment_link", "capacity",
    "tickets_sold", "status", "is_featured", "tags", "slug",
  ] as const;
  for (const field of fields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // A title change alone never regenerates the slug (that would break a
  // shared/saved link) - the slug only changes when the caller explicitly
  // sends one, which is what re-validates/de-duplicates it here.
  if (typeof updates.slug === "string") {
    updates.slug = await generateUniqueEventSlug(updates.slug as string, params.id);
  }

  updates.updated_at = new Date().toISOString();

  // "If status changes to 'published': validate cover_image_url is set;
  // validate stripe_payment_link is set if ticket_price_cents > 0; warn
  // if neither is set" - the request says "warn," not "reject," so these
  // come back as non-blocking warnings alongside the successful save
  // rather than a 400.
  const warnings: string[] = [];
  if (updates.status === "published") {
    const { data: current } = await admin
      .from("events")
      .select("cover_image_url, ticket_price_cents, stripe_payment_link")
      .eq("id", params.id)
      .maybeSingle();
    const coverImage = (updates.cover_image_url as string | undefined) ?? current?.cover_image_url;
    const priceCents = (updates.ticket_price_cents as number | undefined) ?? current?.ticket_price_cents ?? 0;
    const paymentLink = (updates.stripe_payment_link as string | undefined) ?? current?.stripe_payment_link;
    if (!coverImage) warnings.push("No cover image is set.");
    if (priceCents > 0 && !paymentLink) warnings.push("This is a paid event with no Stripe Payment Link set.");
  }

  if (updates.is_featured === true) {
    await admin.from("events").update({ is_featured: false }).eq("is_featured", true).neq("id", params.id);
  }

  const { data: event, error } = await admin
    .from("events")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? "Failed to update event." }, { status: 500 });
  }

  return NextResponse.json({ event, warnings });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await getSupabaseAdmin().from("events").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
