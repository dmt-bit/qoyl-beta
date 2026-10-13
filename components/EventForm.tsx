"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { slugifyEventTitle, type EventRecord } from "@/lib/events";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

const SECTION_LABEL_CLASS = "font-mono text-[9px] uppercase tracking-wide text-muted";

const SUGGESTED_TAGS = [
  "workshop", "meetup", "virtual", "chicago", "atlanta", "new york",
  "beginners", "coily", "curly", "all-hair-types",
];

const TIMEZONES = [
  { value: "ct", label: "Central Time (CT)" },
  { value: "et", label: "Eastern Time (ET)" },
  { value: "mt", label: "Mountain Time (MT)" },
  { value: "pt", label: "Pacific Time (PT)" },
];

// event_date/event_end_date are single `timestamptz` columns - there's
// no separate timezone column in the schema to persist a selection into,
// so the timezone dropdown below is a display label only (shown next to
// formatted times on the public pages, defaulting to "ct" since Qoyl is
// Chicago-based) rather than something that drives real UTC conversion.
// The date+time inputs are combined using the browser's local timezone;
// if the admin's device timezone differs from the one they select here,
// the stored instant will be off by that difference. Flagged as a known
// limitation rather than silently getting timezone math wrong - properly
// fixing this would need a timezone column added to the table.
function toIsoDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function splitIsoDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

type FormState = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  status: "draft" | "published" | "sold_out" | "cancelled";
  is_featured: boolean;
  event_date: string;
  event_time: string;
  event_end_time: string;
  timezone: string;
  is_virtual: boolean;
  virtual_link: string;
  location_name: string;
  location_address: string;
  location_city: string;
  ticket_price_dollars: string;
  stripe_payment_link: string;
  capacity: string;
  tickets_sold: string;
  cover_image_url: string;
  tags: string[];
};

function emptyForm(): FormState {
  return {
    title: "", slug: "", short_description: "", description: "",
    status: "draft", is_featured: false,
    event_date: "", event_time: "", event_end_time: "", timezone: "ct",
    is_virtual: false, virtual_link: "", location_name: "", location_address: "", location_city: "",
    ticket_price_dollars: "0", stripe_payment_link: "", capacity: "", tickets_sold: "0",
    cover_image_url: "", tags: [],
  };
}

function fromEvent(event: EventRecord): FormState {
  const start = splitIsoDateTime(event.event_date);
  const end = splitIsoDateTime(event.event_end_date);
  return {
    title: event.title,
    slug: event.slug,
    short_description: event.short_description ?? "",
    description: event.description,
    status: (event.status === "past" ? "published" : event.status) as FormState["status"],
    is_featured: event.is_featured,
    event_date: start.date,
    event_time: start.time,
    event_end_time: end.time,
    timezone: "ct",
    is_virtual: event.is_virtual,
    virtual_link: event.virtual_link ?? "",
    location_name: event.location_name ?? "",
    location_address: event.location_address ?? "",
    location_city: event.location_city ?? "",
    ticket_price_dollars: (event.ticket_price_cents / 100).toString(),
    stripe_payment_link: event.stripe_payment_link ?? "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    tickets_sold: String(event.tickets_sold ?? 0),
    cover_image_url: event.cover_image_url ?? "",
    tags: event.tags ?? [],
  };
}

export default function EventForm({ password, initialEvent }: { password: string; initialEvent?: EventRecord }) {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(initialEvent ? fromEvent(initialEvent) : emptyForm());
  const [slugTouched, setSlugTouched] = useState(Boolean(initialEvent));
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);

  const isEditing = Boolean(initialEvent);

  useEffect(() => {
    setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleTitleBlur() {
    if (!slugTouched || !values.slug) {
      set("slug", slugifyEventTitle(values.title));
    }
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || values.tags.includes(tag)) return;
    set("tags", [...values.tags, tag]);
  }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
  }

  async function checkOtherFeatured(): Promise<string | null> {
    const res = await fetch("/api/admin/events", { headers: { "x-admin-password": password } });
    if (!res.ok) return null;
    const data = await res.json();
    const other = (data.events ?? []).find(
      (e: EventRecord) => e.is_featured && e.id !== initialEvent?.id
    );
    return other?.title ?? null;
  }

  async function handleFeaturedToggle(next: boolean) {
    if (next) {
      const otherTitle = await checkOtherFeatured();
      if (otherTitle && !confirm(`This will un-feature "${otherTitle}" - continue?`)) {
        return;
      }
    }
    set("is_featured", next);
  }

  function buildPayload(statusOverride?: string) {
    return {
      title: values.title.trim(),
      slug: values.slug || slugifyEventTitle(values.title),
      short_description: values.short_description.trim() || null,
      description: values.description,
      status: statusOverride ?? values.status,
      is_featured: values.is_featured,
      event_date: toIsoDateTime(values.event_date, values.event_time),
      event_end_date: values.event_end_time ? toIsoDateTime(values.event_date, values.event_end_time) : null,
      is_virtual: values.is_virtual,
      virtual_link: values.is_virtual ? values.virtual_link.trim() || null : null,
      location_name: values.is_virtual ? null : values.location_name.trim() || null,
      location_address: values.is_virtual ? null : values.location_address.trim() || null,
      location_city: values.is_virtual ? null : values.location_city.trim() || null,
      ticket_price_cents: Math.round((parseFloat(values.ticket_price_dollars) || 0) * 100),
      stripe_payment_link: values.stripe_payment_link.trim() || null,
      capacity: values.capacity.trim() ? parseInt(values.capacity, 10) : null,
      tickets_sold: parseInt(values.tickets_sold, 10) || 0,
      cover_image_url: values.cover_image_url.trim() || null,
      tags: values.tags,
    };
  }

  async function handleSave(statusOverride?: string) {
    setError(null);
    setWarnings([]);

    if (!values.title.trim()) return setError("Title is required.");
    if (!values.short_description.trim()) return setError("Short description is required.");
    if (!values.description.trim()) return setError("Full description is required.");

    // Named per-field rather than one combined message - see the root-
    // cause note on toIsoDateTime above. The most common real trigger
    // isn't these two checks (date and time typed into the wrong state
    // key, or similar) - it's a native <input type="time"> left on a
    // partially-entered value (hour typed, AM/PM segment never
    // confirmed), which the browser reports as an empty string even
    // though the field visually shows something. Naming the field at
    // least tells the admin which box to look at again.
    if (!values.event_date && !values.event_time) return setError("Event date and time are required.");
    if (!values.event_date) return setError("Event date is required.");
    if (!values.event_time) return setError("Event time is required.");

    // Both fields are non-empty strings, but a native date/time input can
    // still hand back a value its own Date constructor won't parse (rare,
    // but toIsoDateTime returning null here would otherwise silently send
    // event_date: null to the API instead of failing loudly on the form).
    if (!toIsoDateTime(values.event_date, values.event_time)) {
      return setError(
        "Event date/time couldn't be read - re-enter the time (make sure AM/PM is set if your browser shows a 12-hour clock)."
      );
    }

    setSaving(true);
    const payload = buildPayload(statusOverride);
    const res = await fetch(
      isEditing ? `/api/admin/events/${initialEvent!.id}` : "/api/admin/events",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save event.");
      return;
    }
    setLastSavedAt(new Date());
    setDirty(false);
    setWarnings(data.warnings ?? []);
    if (!isEditing) {
      router.push(`/admin/events/${data.event.id}`);
    } else if (statusOverride) {
      set("status", statusOverride as FormState["status"]);
    }
  }

  const charCount = values.short_description.length;

  return (
    <div className="mx-auto max-w-2xl pb-32">
      <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">
        {isEditing ? "Edit event" : "New event"}
      </h1>

      {error && <p className="mt-4 text-sm text-red">{error}</p>}
      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 p-3">
          {warnings.map((w) => (
            <p key={w} className="text-xs text-amber">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* ---- SECTION 1: basics ---- */}
      <section className="mt-8">
        <p className={SECTION_LABEL_CLASS}>event details</p>
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Event title"
            className={INPUT_CLASS}
          />
          <div>
            <input
              type="text"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              className={INPUT_CLASS}
            />
            <p className="mt-1 font-mono text-[9px] text-muted">slug: qoyl.live/events/{values.slug || "..."}</p>
          </div>
          <div>
            <textarea
              value={values.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              rows={2}
              placeholder="Shown on event cards - keep under 120 characters"
              className={INPUT_CLASS}
            />
            <p className={`mt-1 font-mono text-[9px] ${charCount > 120 ? "text-amber" : "text-muted"}`}>
              {charCount} / 120
            </p>
          </div>
          <div>
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={8}
              placeholder="Supports markdown - ## headers, **bold**, bullet lists"
              className={INPUT_CLASS}
            />
            <p className="mt-1 font-mono text-[9px] text-muted">
              describe what attendees will do, learn, and experience. include what&apos;s included in the ticket price.
            </p>
          </div>
          <select value={values.status} onChange={(e) => set("status", e.target.value as FormState["status"])} className={INPUT_CLASS}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="sold_out">Sold out</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label className="flex items-center gap-2 font-sans text-sm text-dark">
            <input
              type="checkbox"
              checked={values.is_featured}
              onChange={(e) => handleFeaturedToggle(e.target.checked)}
            />
            feature this event at the top of the events page
          </label>
        </div>
      </section>

      {/* ---- SECTION 2: date and location ---- */}
      <section className="mt-8">
        <p className={SECTION_LABEL_CLASS}>date and location</p>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={values.event_date} onChange={(e) => set("event_date", e.target.value)} className={INPUT_CLASS} />
            <select value={values.timezone} onChange={(e) => set("timezone", e.target.value)} className={INPUT_CLASS}>
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="time" value={values.event_time} onChange={(e) => set("event_time", e.target.value)} className={INPUT_CLASS} />
            <input
              type="time"
              value={values.event_end_time}
              onChange={(e) => set("event_end_time", e.target.value)}
              placeholder="End time (optional)"
              className={INPUT_CLASS}
            />
          </div>
          <p className="font-mono text-[9px] text-muted">
            if save keeps saying the date/time is required, re-pick the time field - on a 12-hour clock
            the browser won&apos;t register a value until AM/PM is also set
          </p>
          <label className="flex items-center gap-2 font-sans text-sm text-dark">
            <input type="checkbox" checked={values.is_virtual} onChange={(e) => set("is_virtual", e.target.checked)} />
            is this a virtual event?
          </label>
          {values.is_virtual ? (
            <div>
              <input
                type="text"
                value={values.virtual_link}
                onChange={(e) => set("virtual_link", e.target.value)}
                placeholder="Virtual meeting link"
                className={INPUT_CLASS}
              />
              <p className="mt-1 font-mono text-[9px] text-muted">shown to attendees after ticket purchase or RSVP</p>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={values.location_name}
                onChange={(e) => set("location_name", e.target.value)}
                placeholder='Location name, e.g. "1871 Chicago"'
                className={INPUT_CLASS}
              />
              <input
                type="text"
                value={values.location_address}
                onChange={(e) => set("location_address", e.target.value)}
                placeholder="Full street address"
                className={INPUT_CLASS}
              />
              <input
                type="text"
                value={values.location_city}
                onChange={(e) => set("location_city", e.target.value)}
                placeholder='City, e.g. "Chicago, IL"'
                className={INPUT_CLASS}
              />
            </>
          )}
        </div>
      </section>

      {/* ---- SECTION 3: tickets ---- */}
      <section className="mt-8">
        <p className={SECTION_LABEL_CLASS}>tickets</p>
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-dark">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.ticket_price_dollars}
                onChange={(e) => set("ticket_price_dollars", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <p className="mt-1 font-mono text-[9px] text-muted">enter 0 for a free event</p>
            {parseFloat(values.ticket_price_dollars) === 0 || !values.ticket_price_dollars ? (
              <p className="mt-1 rounded-lg bg-green/10 px-3 py-1.5 text-xs text-green">free event</p>
            ) : null}
          </div>
          <div>
            <input
              type="text"
              value={values.stripe_payment_link}
              onChange={(e) => set("stripe_payment_link", e.target.value)}
              placeholder="Stripe Payment Link URL"
              className={INPUT_CLASS}
            />
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
              create a payment link in your Stripe dashboard → Payment Links → Create Link, then paste the URL here.
              set the price to match what you entered above. after payment, Stripe redirects to qoyl.live/events/{values.slug || "..."}
            </p>
            <a
              href="https://dashboard.stripe.com/payment-links"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-[9px] text-bronze2 underline underline-offset-2 hover:text-dark"
            >
              open Stripe dashboard →
            </a>
          </div>
          <div>
            <input
              type="number"
              min="0"
              value={values.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              placeholder="Capacity (optional)"
              className={INPUT_CLASS}
            />
            <p className="mt-1 font-mono text-[9px] text-muted">
              {values.capacity ? "tickets sold is tracked manually - update the tickets sold field after each purchase" : "leave blank for unlimited capacity"}
            </p>
          </div>
          <div>
            <input
              type="number"
              min="0"
              value={values.tickets_sold}
              onChange={(e) => set("tickets_sold", e.target.value)}
              className={INPUT_CLASS}
            />
            <p className="mt-1 font-mono text-[9px] text-muted">update this manually after Stripe sales - we&apos;ll automate this later</p>
            {values.capacity && parseInt(values.tickets_sold, 10) >= parseInt(values.capacity, 10) && values.status !== "sold_out" && (
              <button
                type="button"
                onClick={() => set("status", "sold_out")}
                className="mt-1 font-mono text-[9px] text-amber underline underline-offset-2"
              >
                tickets sold has reached capacity - mark as sold out?
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---- SECTION 4: cover image ---- */}
      <section className="mt-8">
        <p className={SECTION_LABEL_CLASS}>cover image</p>
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={values.cover_image_url}
            onChange={(e) => set("cover_image_url", e.target.value)}
            placeholder="Cloudinary URL"
            className={INPUT_CLASS}
          />
          <p className="font-mono text-[9px] text-muted">
            upload to Cloudinary first, then paste the URL here. recommended: 1200 × 630px, landscape orientation.
          </p>
          {values.cover_image_url && (
            <div>
              <p className="font-mono text-[8px] text-muted">preview</p>
              <div className="mt-1 aspect-[16/9] w-full overflow-hidden rounded-lg bg-[#f5f5f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={values.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
          <p className="font-mono text-[9px] text-muted">use f_auto,q_auto in your Cloudinary URL for best performance</p>
        </div>
      </section>

      {/* ---- SECTION 5: tags ---- */}
      <section className="mt-8">
        <p className={SECTION_LABEL_CLASS}>tags</p>
        <div className="mt-3">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Type and press enter or comma to add a tag"
            className={INPUT_CLASS}
          />
          {values.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {values.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-bronze px-3 py-1 text-xs text-cream">
                  {tag}
                  <button
                    type="button"
                    onClick={() => set("tags", values.tags.filter((t) => t !== tag))}
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 font-mono text-[9px] text-muted">
            suggested:{" "}
            {SUGGESTED_TAGS.map((t, i) => (
              <span key={t}>
                <button type="button" onClick={() => addTag(t)} className="underline underline-offset-2 hover:text-dark">
                  {t}
                </button>
                {i < SUGGESTED_TAGS.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ---- Sticky save bar ---- */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-dark bg-white px-6 py-4">
        <p className="font-mono text-[9px] text-muted">
          {saving
            ? "saving..."
            : dirty
            ? "unsaved changes"
            : lastSavedAt
            ? `last saved ${lastSavedAt.toLocaleTimeString()}`
            : ""}
        </p>
        <div className="flex gap-3">
          {values.status === "published" ? (
            <>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="border border-bronze/40 px-4 py-2.5 text-sm font-medium text-dark transition-colors hover:border-bronze disabled:opacity-50"
              >
                unpublish
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="bg-bronze px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                save changes →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="border border-bronze/40 px-4 py-2.5 text-sm font-medium text-dark transition-colors hover:border-bronze disabled:opacity-50"
              >
                save draft
              </button>
              <button
                type="button"
                onClick={() => handleSave("published")}
                disabled={saving}
                className="bg-bronze px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2 disabled:opacity-50"
              >
                save and publish →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
