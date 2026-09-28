import Image from "next/image";
import Link from "next/link";
import {
  eventCta,
  eventLocationLabel,
  eventTypeTag,
  formatEventDateChip,
  formatEventDateShort,
  formatEventPrice,
  type EventRecord,
} from "@/lib/events";

function EventCtaButton({ event, style }: { event: EventRecord; style: "full" | "short" }) {
  const cta = eventCta(event, style);
  const full = style === "full";

  if (cta.kind === "cancelled") {
    return <span className="font-mono text-[11px] text-red">{cta.label}</span>;
  }
  if (cta.kind === "disabled") {
    return full ? (
      <span className="inline-block cursor-not-allowed border border-dark/30 px-6 py-3 text-center font-mono text-[11px] lowercase text-dark/40">
        {cta.label}
      </span>
    ) : (
      <span className="font-mono text-[11px] text-[#aaa]">{cta.label}</span>
    );
  }
  const href = cta.kind === "mailto" ? cta.href : cta.href;
  return full ? (
    <a
      href={href}
      target={cta.kind === "link" ? "_blank" : undefined}
      rel={cta.kind === "link" ? "noopener noreferrer" : undefined}
      className="inline-block bg-dark px-6 py-3 text-center font-mono text-[11px] lowercase text-white transition-colors hover:bg-bronze2"
    >
      {cta.label}
    </a>
  ) : (
    <a
      href={href}
      target={cta.kind === "link" ? "_blank" : undefined}
      rel={cta.kind === "link" ? "noopener noreferrer" : undefined}
      className="font-mono text-[11px] text-dark underline underline-offset-2 hover:text-bronze2"
    >
      {cta.label}
    </a>
  );
}

export function FeaturedEventCard({ event }: { event: EventRecord }) {
  return (
    <div className="grid w-full grid-cols-1 border-b border-dark md:grid-cols-2">
      <div className="relative h-64 w-full bg-dark md:h-auto">
        {event.cover_image_url ? (
          <Image src={event.cover_image_url} alt={event.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="flex h-full min-h-64 w-full items-center justify-center bg-dark p-8">
            <p className="text-center font-sans text-2xl font-bold lowercase tracking-[-1px] text-white">{event.title}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center bg-white p-6 md:p-10">
        <span className="font-mono text-[9px] lowercase tracking-wide text-muted">{eventTypeTag(event)}</span>
        <Link href={`/events/${event.slug}`}>
          <h2 className="mt-2 font-sans text-[28px] font-bold lowercase leading-tight tracking-[-1px] text-dark">{event.title}</h2>
        </Link>
        <p className="mt-3 font-mono text-[11px] text-dark">{formatEventDateShort(event.event_date)}</p>
        <p className="mt-1 font-mono text-[10px] lowercase text-muted">{eventLocationLabel(event)}</p>
        {event.short_description && (
          <p className="mt-4 font-sans text-[13px] font-light leading-[1.75] text-[#666]">{event.short_description}</p>
        )}
        <p className="mt-4 font-mono text-[20px] font-bold text-dark">{formatEventPrice(event.ticket_price_cents)}</p>
        <div className="mt-4">
          <EventCtaButton event={event} style="full" />
        </div>
      </div>
    </div>
  );
}

export function EventGridCard({ event }: { event: EventRecord }) {
  const isPast = event.status === "past";
  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <Link href={`/events/${event.slug}`} className="relative block aspect-[16/9] w-full shrink-0 bg-[#f5f5f5]">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className={`object-cover ${isPast ? "opacity-50" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4">
            <p className="text-center font-sans text-sm font-medium lowercase text-dark">{event.title}</p>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="inline-block border border-dark px-2.5 py-0.5 font-mono text-[9px] font-bold text-dark">
            {isPast ? `${formatEventDateChip(event.event_date).split(" ·")[0]} · past` : formatEventDateChip(event.event_date)}
          </span>
        </div>
        <Link href={`/events/${event.slug}`}>
          <p className="mt-2.5 font-sans text-base font-semibold lowercase tracking-[-0.3px] text-dark">{event.title}</p>
        </Link>
        <p className="mt-1 font-mono text-[9px] lowercase text-muted">{eventLocationLabel(event)}</p>
        {event.short_description && (
          <p className="mt-2 line-clamp-2 font-sans text-xs font-light leading-[1.65] text-[#666]">{event.short_description}</p>
        )}
        {!isPast && (
          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="font-mono text-sm font-bold text-dark">{formatEventPrice(event.ticket_price_cents)}</span>
            <EventCtaButton event={event} style="short" />
          </div>
        )}
      </div>
    </div>
  );
}
