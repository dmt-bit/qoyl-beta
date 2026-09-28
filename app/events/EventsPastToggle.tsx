"use client";

import { useState } from "react";
import { EventGridCard } from "@/components/EventCard";
import type { EventRecord } from "@/lib/events";

export default function EventsPastToggle({ events }: { events: EventRecord[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-dark px-5 py-6 sm:px-10">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="font-mono text-[10px] uppercase tracking-wide text-muted"
      >
        past events ({events.length}) {expanded ? "↑" : "↓"}
      </button>
      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-px bg-dark md:grid-cols-2">
          {events.map((event) => (
            <EventGridCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
