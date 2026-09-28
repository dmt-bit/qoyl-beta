"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EVENT_STATUS_LABEL, eventTicketsLabel, formatEventDateChip, formatEventPrice, type EventRecord } from "@/lib/events";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

const STATUS_CHIP_CLASS: Record<string, string> = {
  draft: "border border-dark/40 text-dark/60",
  published: "bg-dark text-white",
  sold_out: "bg-amber/20 text-amber",
  cancelled: "bg-red/20 text-red",
  past: "border border-dark/20 text-dark/40",
};

const FILTER_TABS = [
  { key: "all", label: "all" },
  { key: "draft", label: "draft" },
  { key: "live", label: "live" },
  { key: "past", label: "past" },
] as const;

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium lowercase ${STATUS_CHIP_CLASS[status] ?? ""}`}>
      {EVENT_STATUS_LABEL[status as keyof typeof EVENT_STATUS_LABEL] ?? status}
    </span>
  );
}

export default function AdminEventsPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]["key"]>("all");

  async function loadEvents(pw: string): Promise<boolean> {
    setLoading(true);
    setAuthError(null);
    const res = await fetch("/api/admin/events", { headers: { "x-admin-password": pw } });
    setLoading(false);
    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setAuthError("Couldn't load events. Try again.");
      return false;
    }
    const data = await res.json();
    setEvents(data.events ?? []);
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadEvents(stored).then((ok) => {
      if (ok) {
        setPassword(stored);
        setAuthorized(true);
      } else {
        sessionStorage.removeItem("admin_password");
      }
      setCheckingStoredAuth(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const ok = await loadEvents(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    }
  }

  async function togglePublish(event: EventRecord) {
    const nextStatus = event.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ status: nextStatus }),
    });
    loadEvents(password);
  }

  async function deleteEvent(event: EventRecord) {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/events/${event.id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    loadEvents(password);
  }

  if (checkingStoredAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white font-sans">
        <p className="text-sm text-dark/60">Loading...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 font-sans text-dark">
        <form onSubmit={handleUnlock} className="w-full max-w-sm rounded-xl border border-bronze/30 p-6">
          <h1 className="font-serif text-2xl font-semibold text-dark">Admin access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            required
            className={`mt-4 ${INPUT_CLASS}`}
          />
          {authError && <p className="mt-2 text-sm text-red">{authError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-bronze py-3 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </main>
    );
  }

  const total = events.length;
  const upcomingCount = events.filter((e) => e.status === "published" || e.status === "sold_out").length;
  const draftCount = events.filter((e) => e.status === "draft").length;

  const filtered = events.filter((e) => {
    if (filter === "all") return true;
    if (filter === "draft") return e.status === "draft";
    if (filter === "live") return e.status === "published" || e.status === "sold_out";
    if (filter === "past") return e.status === "past" || e.status === "cancelled";
    return true;
  });

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">Events</h1>
            <p className="mt-1 font-mono text-[10px] lowercase text-muted">
              {total} total · {upcomingCount} upcoming · {draftCount} draft
            </p>
          </div>
          <Link
            href="/admin/events/new"
            className="shrink-0 bg-bronze px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            + add event
          </Link>
        </div>

        <div className="mt-6 flex gap-4 border-b border-bronze/20">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`pb-3 font-mono text-[11px] lowercase transition-colors ${
                filter === tab.key ? "border-b-2 border-bronze text-dark" : "text-dark/50 hover:text-dark/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="mt-4 text-sm text-dark/50">Loading...</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-dark/20 font-sans text-[11px] text-dark/50">
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Cover</th>
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Price</th>
                <th className="py-2 pr-3 font-medium">Tickets</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id} className="border-b border-dark/10 align-top">
                  <td className="py-3 pr-3">
                    <StatusChip status={event.status} />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-[#f5f5f5]">
                      {event.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-[8px] text-muted">
                          no image
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-sans text-[13px] font-medium text-dark">{event.title}</p>
                    <p className="font-mono text-[9px] text-muted">
                      {event.is_virtual ? "virtual" : event.location_city || event.location_name || "—"}
                    </p>
                  </td>
                  <td className="py-3 pr-3 font-mono text-[10px] text-dark">{formatEventDateChip(event.event_date)}</td>
                  <td className="py-3 pr-3 font-mono text-[13px] font-bold text-dark">
                    {formatEventPrice(event.ticket_price_cents)}
                  </td>
                  <td className="py-3 pr-3 font-mono text-[10px] text-dark">{eventTicketsLabel(event)}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                      <Link href={`/admin/events/${event.id}`} className="text-bronze2 underline underline-offset-2 hover:text-dark">
                        edit
                      </Link>
                      {event.status !== "past" && event.status !== "cancelled" && (
                        <button type="button" onClick={() => togglePublish(event)} className="text-bronze2 underline underline-offset-2 hover:text-dark">
                          {event.status === "published" ? "unpublish" : "publish"}
                        </button>
                      )}
                      <button type="button" onClick={() => deleteEvent(event)} className="text-red underline underline-offset-2 hover:text-dark">
                        delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-6 text-center font-sans text-sm text-dark/50">
                    No events in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
