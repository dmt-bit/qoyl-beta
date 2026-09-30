import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { autoExpirePastEvents } from "@/lib/events";

// Slim strip at the very top of the home page, below the nav - only the
// single next upcoming *published* event (sold_out/cancelled excluded,
// matching the request's literal WHERE status = 'published'). Hidden
// entirely with no upcoming event; the caller (app/page.tsx) needs to
// know in advance whether this rendered anything at all, to size
// HeroCollage's height correctly - so this is async and awaited in
// app/page.tsx rather than each managing its own boolean independently.
export type NextEvent = {
  title: string;
  slug: string;
  event_date: string;
  location_city: string | null;
};

export async function getNextPublishedEvent(): Promise<NextEvent | null> {
  await autoExpirePastEvents();
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("events")
    .select("title, slug, event_date, location_city")
    .eq("status", "published")
    .gt("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

function truncateTitle(title: string, max = 24): string {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}

export default function EventStrip({ event }: { event: NextEvent }) {
  const dateLabel = new Date(event.event_date)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toLowerCase();
  const locationLabel = event.location_city ? ` · ${event.location_city.toLowerCase()}` : "";

  return (
    <Link
      href={`/events/${event.slug}`}
      className="flex h-9 items-center justify-between bg-dark px-4 text-white"
    >
      <span className="font-mono text-[10px] text-muted">
        {dateLabel}
        {locationLabel}
      </span>
      <span className="font-sans text-[12px] font-medium text-white">
        {truncateTitle(event.title)} →
      </span>
    </Link>
  );
}
