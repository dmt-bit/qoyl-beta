import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Server-only (imports getSupabaseAdmin) - never import this from a
// "use client" component. Every public/admin events page and API route
// shares this one module for data access so the auto-expire-past-events
// check and the public-status filter only live in one place.

export type EventStatus = "draft" | "published" | "sold_out" | "cancelled" | "past";

export type EventRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string | null;
  event_date: string;
  event_end_date: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  is_virtual: boolean;
  virtual_link: string | null;
  cover_image_url: string | null;
  ticket_price_cents: number;
  stripe_payment_link: string | null;
  capacity: number | null;
  tickets_sold: number;
  status: EventStatus;
  is_featured: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export const PUBLIC_STATUSES: EventStatus[] = ["published", "sold_out", "past"];

// "Add a check ... if status = 'published' AND event_date < now() - 2h,
// update to 'past' ... in the same request" - runs at the top of every
// public read (list, detail, and the public API routes below) so status
// stays current without a cron job. Uses the admin client (bypasses RLS)
// since the anon role has no update policy on this table - see
// supabase/create_events.sql for why the select policy itself also
// excludes drafts rather than relying on app-layer filtering alone.
export async function autoExpirePastEvents(): Promise<void> {
  const admin = getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { error } = await admin
    .from("events")
    .update({ status: "past", updated_at: new Date().toISOString() })
    .eq("status", "published")
    .lt("event_date", cutoffIso);
  if (error) console.error("[events] auto-expire-past-events failed:", error.message);
}

// The request's literal "ORDER BY event_date ASC (upcoming first, past at
// bottom)" is self-contradictory - a plain ascending date sort puts the
// OLDEST past events first, not last. Using the same compound sort the
// request's own admin query already specifies for the analogous case
// (CASE WHEN status='past' THEN 1 ELSE 0 END, event_date ASC), which
// actually produces "upcoming first, past at bottom."
export async function getPublicEvents(): Promise<EventRecord[]> {
  await autoExpirePastEvents();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("events")
    .select("*")
    .in("status", PUBLIC_STATUSES)
    .order("event_date", { ascending: true });
  if (error || !data) return [];
  const rows = data as EventRecord[];
  const upcoming = rows.filter((e) => e.status !== "past");
  const past = rows.filter((e) => e.status === "past");
  return [...upcoming, ...past];
}

export async function getEventBySlug(slug: string): Promise<EventRecord | null> {
  await autoExpirePastEvents();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("events").select("*").eq("slug", slug).neq("status", "draft").maybeSingle();
  if (error || !data) return null;
  return data as EventRecord;
}

export async function getRelatedEvents(excludeId: string, limit = 2): Promise<EventRecord[]> {
  const events = await getPublicEvents();
  return events.filter((e) => e.id !== excludeId && e.status !== "past").slice(0, limit);
}

// ---- Slug generation (admin create/edit) -----------------------------

export function slugifyEventTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "event";
}

// Appends -2/-3/... on collision, per the request. excludeId lets an
// edit keep its own existing slug without colliding with itself.
export async function generateUniqueEventSlug(title: string, excludeId?: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const base = slugifyEventTitle(title);
  let slug = base;
  let suffix = 2;
  for (;;) {
    let query = admin.from("events").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

// ---- Display helpers shared by admin table + public cards -------------

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "draft",
  published: "live",
  sold_out: "sold out",
  cancelled: "cancelled",
  past: "past",
};

// The schema has no literal "event type" column - only is_virtual and a
// free-form tags array - so the featured card's "workshop"/"meetup"/
// "virtual" tag is derived: virtual wins outright (it's the more useful
// fact to lead with), otherwise the first matching known tag, otherwise
// a plain "event" fallback.
const KNOWN_EVENT_TYPE_TAGS = ["workshop", "meetup"];
export function eventTypeTag(event: EventRecord): string {
  if (event.is_virtual) return "virtual";
  const match = event.tags?.find((t) => KNOWN_EVENT_TYPE_TAGS.includes(t.toLowerCase()));
  return match?.toLowerCase() ?? "event";
}

export function formatEventPrice(cents: number): string {
  if (cents <= 0) return "free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function formatEventDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// "saturday, january 18 · 2:00 pm" - featured card format (no year).
export function formatEventDateShort(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${date} · ${time}`;
}

// "jan 18 · 2pm" - grid card date chip.
export function formatEventDateChip(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: d.getMinutes() === 0 ? undefined : "2-digit" })
    .toLowerCase()
    .replace(" ", "");
  return `${date} · ${time}`;
}

export function formatEventTimeRange(startIso: string, endIso: string | null): string {
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return endIso ? `${fmt(startIso)} – ${fmt(endIso)} ct` : fmt(startIso);
}

export function eventLocationLabel(event: EventRecord): string {
  if (event.is_virtual) return "virtual";
  return event.location_city || event.location_name || "location tba";
}

export function eventSpotsLabel(event: EventRecord): string {
  if (event.capacity == null) return "open enrollment";
  const left = Math.max(0, event.capacity - (event.tickets_sold ?? 0));
  return `${left} spot${left === 1 ? "" : "s"} left`;
}

export function eventTicketsLabel(event: { capacity: number | null; tickets_sold: number }): string {
  if (event.capacity != null) return `${event.tickets_sold} / ${event.capacity}`;
  if (event.tickets_sold > 0) return `${event.tickets_sold} sold`;
  return "—";
}

// ---- CTA (shared by the featured card, grid cards, and the detail
// page's ticket widget - "full" uses the longer copy given for the
// featured card/detail widget, "short" the grid card's terser labels) ---

export type EventCta =
  | { kind: "link"; label: string; href: string }
  | { kind: "disabled"; label: string }
  | { kind: "cancelled"; label: string }
  | { kind: "mailto"; label: string; href: string };

// A free event with no stripe_payment_link falls back to a mailto RSVP -
// the request describes "a simple RSVP form"/"email capture form" for
// this case, but PART 1's schema has no table to store an RSVP/email in,
// so there's nothing to persist it to yet. A mailto keeps the flow
// functional without inventing unrequested storage.
const RSVP_MAILTO = "mailto:hello@qoyl.live";

export function eventCta(event: EventRecord, style: "full" | "short" = "full"): EventCta {
  const isFree = event.ticket_price_cents <= 0;
  if (event.status === "cancelled") {
    return { kind: "cancelled", label: style === "full" ? "this event was cancelled" : "cancelled" };
  }
  if (event.status === "past") {
    return { kind: "disabled", label: "this event has passed" };
  }
  if (event.status === "sold_out") {
    return { kind: "disabled", label: "sold out" };
  }
  // status === "published" from here down.
  if (isFree) {
    if (event.stripe_payment_link) {
      return { kind: "link", label: style === "full" ? "rsvp — it's free →" : "rsvp →", href: event.stripe_payment_link };
    }
    return { kind: "mailto", label: style === "full" ? "rsvp — it's free →" : "rsvp →", href: RSVP_MAILTO };
  }
  const priceLabel = formatEventPrice(event.ticket_price_cents);
  return {
    kind: "link",
    label: style === "full" ? `get tickets — ${priceLabel} →` : "tickets →",
    href: event.stripe_payment_link ?? RSVP_MAILTO,
  };
}
