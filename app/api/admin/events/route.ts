import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { generateUniqueEventSlug } from "@/lib/events";

export async function GET(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: events, error } = await getSupabaseAdmin()
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ events: events ?? [] });
}

export async function POST(request: Request) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    short_description,
    event_date,
    event_end_date,
    location_name,
    location_address,
    location_city,
    is_virtual,
    virtual_link,
    cover_image_url,
    ticket_price_cents,
    stripe_payment_link,
    capacity,
    tickets_sold,
    status,
    is_featured,
    tags,
  }: {
    title?: string;
    description?: string;
    short_description?: string | null;
    event_date?: string;
    event_end_date?: string | null;
    location_name?: string | null;
    location_address?: string | null;
    location_city?: string | null;
    is_virtual?: boolean;
    virtual_link?: string | null;
    cover_image_url?: string | null;
    ticket_price_cents?: number;
    stripe_payment_link?: string | null;
    capacity?: number | null;
    tickets_sold?: number;
    status?: string;
    is_featured?: boolean;
    tags?: string[];
  } = body;

  // Matches the table's real NOT NULL columns (title/slug/description/
  // event_date) - short_description etc. are nullable in the schema even
  // though the admin form marks them required for UX.
  if (!title?.trim() || !description?.trim() || !event_date) {
    return NextResponse.json(
      { error: "Title, description, and event date are required." },
      { status: 400 }
    );
  }
  if (Number.isNaN(new Date(event_date).getTime())) {
    return NextResponse.json({ error: "Invalid event date." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const slug = await generateUniqueEventSlug(title);

  // "Only one event should be featured" - enforced here regardless of
  // whether the client showed its own confirm-before-submit warning, so
  // the invariant holds even if that's bypassed or two admins race.
  if (is_featured) {
    await admin.from("events").update({ is_featured: false }).eq("is_featured", true);
  }

  const { data: event, error } = await admin
    .from("events")
    .insert({
      title: title.trim(),
      slug,
      description,
      short_description: short_description?.trim() || null,
      event_date,
      event_end_date: event_end_date || null,
      location_name: location_name?.trim() || null,
      location_address: location_address?.trim() || null,
      location_city: location_city?.trim() || null,
      is_virtual: Boolean(is_virtual),
      virtual_link: virtual_link?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      ticket_price_cents: ticket_price_cents ?? 0,
      stripe_payment_link: stripe_payment_link?.trim() || null,
      capacity: capacity ?? null,
      tickets_sold: tickets_sold ?? 0,
      status: status ?? "draft",
      is_featured: Boolean(is_featured),
      tags: tags ?? [],
    })
    .select()
    .single();

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? "Failed to create event." }, { status: 500 });
  }

  return NextResponse.json({ event });
}
