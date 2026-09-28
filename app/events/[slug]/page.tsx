import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { EventGridCard } from "@/components/EventCard";
import {
  eventCta,
  eventLocationLabel,
  eventSpotsLabel,
  formatEventDateLong,
  formatEventPrice,
  formatEventTimeRange,
  getEventBySlug,
  getRelatedEvents,
} from "@/lib/events";
import EventShareButton from "./EventShareButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEventBySlug(params.slug);
  if (!event) return { title: "Event not found - Qoyl" };
  return {
    title: `${event.title} - Qoyl Events`,
    description: event.short_description ?? event.description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.short_description ?? undefined,
      images: event.cover_image_url ? [event.cover_image_url] : undefined,
    },
  };
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[8px] uppercase tracking-wide text-[#aaa]">{label}</p>
      <p className="mt-0.5 font-sans text-[13px] font-medium text-dark">{value}</p>
    </div>
  );
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await getEventBySlug(params.slug);
  if (!event) notFound();

  const related = await getRelatedEvents(event.id, 2);
  const cta = eventCta(event, "full");

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <div className="relative h-[400px] w-full bg-dark">
        {event.cover_image_url && (
          <Image src={event.cover_image_url} alt={event.title} fill sizes="100vw" className="object-cover" priority />
        )}
        <div className="absolute bottom-0 left-0 right-0 border-t-[1.5px] border-dark bg-white px-6 py-5">
          <h1 className="font-sans text-2xl font-bold lowercase tracking-[-0.8px] text-dark">{event.title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-b border-dark px-6 py-4">
        <DetailChip label="date" value={formatEventDateLong(event.event_date)} />
        <DetailChip label="time" value={formatEventTimeRange(event.event_date, event.event_end_date)} />
        <DetailChip label="location" value={event.is_virtual ? "virtual" : event.location_name || eventLocationLabel(event)} />
        <DetailChip label="price" value={formatEventPrice(event.ticket_price_cents)} />
        <DetailChip label="spots" value={eventSpotsLabel(event)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr]">
        <div className="px-6 py-10 md:px-6 md:py-10">
          <div className="space-y-4 font-sans text-sm font-light leading-[1.85] text-[#666] [&_h2]:mt-6 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-bold [&_h2]:lowercase [&_h2]:text-dark [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_p]:leading-relaxed [&_strong]:text-dark [&_ul]:list-disc [&_ul]:space-y-2">
            <ReactMarkdown>{event.description}</ReactMarkdown>
          </div>
        </div>

        <div className="border-t border-dark px-6 py-8 md:sticky md:top-20 md:h-fit md:border-l md:border-t-0">
          <div className="border border-dark bg-white p-6">
            <p className="font-mono text-[32px] font-bold text-dark">{formatEventPrice(event.ticket_price_cents)}</p>
            {event.ticket_price_cents > 0 && <p className="font-mono text-[10px] text-muted">per person</p>}

            <p className="mt-4 font-mono text-[10px] leading-[1.8] text-muted">
              {formatEventDateLong(event.event_date)}
              <br />
              {eventLocationLabel(event)}
            </p>

            <div className="mt-4">
              {cta.kind === "cancelled" || cta.kind === "disabled" ? (
                <span className="block w-full cursor-not-allowed border border-dark/30 py-3 text-center font-mono text-[12px] lowercase text-dark/40">
                  {cta.label}
                </span>
              ) : (
                <a
                  href={cta.href}
                  target={cta.kind === "link" ? "_blank" : undefined}
                  rel={cta.kind === "link" ? "noopener noreferrer" : undefined}
                  className="block w-full bg-dark py-3 text-center font-mono text-[12px] lowercase text-white transition-colors hover:bg-bronze2"
                >
                  {cta.label}
                </a>
              )}
            </div>

            {event.ticket_price_cents > 0 && (
              <p className="mt-2 text-center font-mono text-[9px] text-[#aaa]">secured by stripe</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-dark px-6 py-6">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">share this event</p>
        <EventShareButton slug={event.slug} />
      </div>

      {related.length > 0 && (
        <div className="border-t border-dark px-6 py-10">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">other events</p>
          <div className="mt-4 grid grid-cols-1 gap-px bg-dark md:grid-cols-2">
            {related.map((r) => (
              <EventGridCard key={r.id} event={r} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
