import { EventGridCard, FeaturedEventCard } from "@/components/EventCard";
import { getPublicEvents } from "@/lib/events";
import EventsPastToggle from "./EventsPastToggle";

export const dynamic = "force-dynamic";

function nextEventCountdown(upcoming: { event_date: string }[]): number | null {
  const next = upcoming[0];
  if (!next) return null;
  const days = Math.ceil((new Date(next.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
}

export default async function EventsPage() {
  const events = await getPublicEvents();
  const featured = events.find((e) => e.is_featured && e.status !== "past") ?? null;
  const upcoming = events.filter((e) => e.status !== "past" && e.id !== featured?.id);
  const past = events.filter((e) => e.status === "past");
  const countdownDays = nextEventCountdown(upcoming.length > 0 ? upcoming : featured ? [featured] : []);

  return (
    <main className="min-h-screen bg-white font-sans text-dark">
      <div className="w-full border-b border-dark px-5 py-8 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-sans text-[40px] font-bold lowercase leading-none tracking-[-2px] text-dark sm:text-[48px]">
              events
            </h1>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted">
              workshops, meetups, and hair days from qoyl
            </p>
          </div>
          {countdownDays !== null && (
            <p className="font-mono text-2xl font-bold text-dark">
              next event in {countdownDays} day{countdownDays === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {featured && <FeaturedEventCard event={featured} />}

      {upcoming.length > 0 && (
        <div className="px-5 py-8 sm:px-10">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">upcoming</p>
          <div className="mt-4 grid grid-cols-1 gap-px bg-dark md:grid-cols-2">
            {upcoming.map((event) => (
              <EventGridCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {!featured && upcoming.length === 0 && (
        <div className="flex flex-col items-center justify-center px-5 py-24 text-center">
          <p className="font-sans text-base text-[#666]">no upcoming events right now</p>
          <p className="mt-2 font-mono text-[10px] text-muted">
            follow{" "}
            <a
              href="https://instagram.com/clubqoyl"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-dark"
            >
              @clubqoyl
            </a>{" "}
            on instagram for event announcements
          </p>
        </div>
      )}

      {past.length > 0 && <EventsPastToggle events={past} />}
    </main>
  );
}
