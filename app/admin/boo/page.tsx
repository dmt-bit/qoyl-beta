"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LOCATIONS,
  SIZES,
  TOOLS,
  type BooLocationId,
  type SizeId,
  type ToolId,
} from "@/lib/boo/config";

const INPUT_CLASS =
  "w-full rounded-lg border border-bronze/40 bg-transparent px-4 py-3 text-sm text-dark placeholder:text-dark/40 focus:border-bronze focus:outline-none";

type BooOrder = {
  id: string;
  created_at: string;
  user_id: string | null;
  guest_email: string | null;
  size: SizeId;
  size_price_cents: number;
  location: BooLocationId;
  bonnet_color: string;
  tool: ToolId;
  candy: boolean;
  beanie: boolean;
  beanie_color: string | null;
  minis: string[];
  extra_minis: number;
  full_size_product: string | null;
  is_gift: boolean;
  gift_recipient_name: string | null;
  payment_method: "auto_charge" | "tap_to_pay";
  status: "reserved" | "ready" | "collected" | "cancelled";
  golden_ticket: boolean;
};

const TOOL_LABEL: Record<ToolId, string> = Object.fromEntries(TOOLS.map((t) => [t.val, t.label])) as Record<
  ToolId,
  string
>;
const LOCATION_LABEL: Record<BooLocationId, string> = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l.label])
) as Record<BooLocationId, string>;

const STATUS_CHIP_CLASS: Record<string, string> = {
  reserved: "border border-dark/40 text-dark/60",
  ready: "bg-amber/20 text-amber",
  collected: "bg-green/20 text-green",
  cancelled: "bg-red/20 text-red",
};

function count<T extends string | boolean>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const item of items) m.set(item, (m.get(item) ?? 0) + 1);
  return m;
}

function CountList<T extends string>({ title, counts, labelFor }: { title: string; counts: Map<T, number>; labelFor?: (v: T) => string }) {
  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg border border-bronze/30 p-4">
      <p className="font-mono text-[9px] uppercase tracking-wide text-muted">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-dark/40">none yet</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map(([val, n]) => (
            <li key={String(val)} className="flex items-center justify-between text-sm text-dark">
              <span>{labelFor ? labelFor(val) : String(val)}</span>
              <span className="font-mono text-[11px] font-bold text-bronze2">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminBooPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  const [orders, setOrders] = useState<BooOrder[]>([]);
  const [namesByUserId, setNamesByUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadOrders(pw: string): Promise<boolean> {
    setLoading(true);
    setLoadError(null);
    const res = await fetch("/api/admin/boo", { headers: { "x-admin-password": pw } });
    setLoading(false);
    if (res.status === 401) {
      setAuthError("Incorrect password.");
      return false;
    }
    if (!res.ok) {
      setLoadError("Couldn't load orders. Try again.");
      return false;
    }
    const data = await res.json();
    setOrders(data.orders ?? []);
    setNamesByUserId(data.namesByUserId ?? {});
    return true;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_password");
    if (!stored) {
      setCheckingStoredAuth(false);
      return;
    }
    loadOrders(stored).then((ok) => {
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
    const ok = await loadOrders(password);
    if (ok) {
      sessionStorage.setItem("admin_password", password);
      setAuthorized(true);
    }
  }

  function nameFor(order: BooOrder): string {
    if (order.user_id && namesByUserId[order.user_id]) return namesByUserId[order.user_id];
    return order.guest_email ?? "guest (no email)";
  }

  const toolCounts = useMemo(() => count(orders.map((o) => o.tool)), [orders]);
  const beanieColorCounts = useMemo(
    () => count(orders.filter((o) => o.beanie && o.beanie_color).map((o) => o.beanie_color as string)),
    [orders]
  );
  const candyCounts = useMemo(() => count(orders.map((o) => (o.candy ? "yes" : "no"))), [orders]);
  const miniCounts = useMemo(() => count(orders.flatMap((o) => o.minis)), [orders]);
  const sizeCounts = useMemo(() => count(orders.map((o) => o.size)), [orders]);
  const locationCounts = useMemo(() => count(orders.map((o) => o.location)), [orders]);

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

  return (
    <main className="min-h-screen bg-white px-4 py-10 font-sans text-dark sm:px-6 print:hidden">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">🎃 Boo Basket orders</h1>
            <p className="mt-1 font-mono text-[10px] lowercase text-muted">{orders.length} total</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="shrink-0 bg-bronze px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            print labels
          </button>
        </div>

        {loading && <p className="mt-4 text-sm text-dark/50">Loading...</p>}
        {loadError && <p className="mt-4 text-sm text-red">{loadError}</p>}

        {/* ---- shopping list ---- */}
        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-dark">Shopping list</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <CountList title="Size" counts={sizeCounts} labelFor={(v) => SIZES[v as SizeId]?.label ?? v} />
            <CountList title="Location" counts={locationCounts} labelFor={(v) => LOCATION_LABEL[v as BooLocationId] ?? v} />
            <CountList title="Tool" counts={toolCounts} labelFor={(v) => TOOL_LABEL[v as ToolId] ?? v} />
            <CountList title="Beanie color" counts={beanieColorCounts} />
            <CountList title="Candy" counts={candyCounts} />
            <CountList title="Minis" counts={miniCounts} />
          </div>
        </section>

        {/* ---- orders table ---- */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-dark">All orders</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-dark/20 font-sans text-[11px] text-dark/50">
                  <th className="py-2 pr-3 font-medium">Name / email</th>
                  <th className="py-2 pr-3 font-medium">Size</th>
                  <th className="py-2 pr-3 font-medium">Location</th>
                  <th className="py-2 pr-3 font-medium">Bonnet</th>
                  <th className="py-2 pr-3 font-medium">Tool</th>
                  <th className="py-2 pr-3 font-medium">Beanie</th>
                  <th className="py-2 pr-3 font-medium">Candy</th>
                  <th className="py-2 pr-3 font-medium">Minis</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-dark/10 align-top">
                    <td className="py-3 pr-3 font-sans text-[13px] text-dark">
                      {nameFor(order)}
                      {order.is_gift && <span className="ml-1 font-mono text-[9px] text-amber">gift</span>}
                      {order.golden_ticket && <span className="ml-1">🎟️</span>}
                    </td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-dark">{SIZES[order.size].label}</td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-dark">{LOCATION_LABEL[order.location]}</td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-dark">{order.bonnet_color}</td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-dark">{TOOL_LABEL[order.tool]}</td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-dark">
                      {order.beanie ? order.beanie_color ?? "yes" : "—"}
                    </td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-dark">{order.candy ? "yes" : "no"}</td>
                    <td className="py-3 pr-3 font-mono text-[9px] text-dark">
                      {order.minis.join(", ")}
                      {order.extra_minis > 0 && ` (+${order.extra_minis} extra)`}
                      {order.full_size_product && <br />}
                      {order.full_size_product}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium lowercase ${STATUS_CHIP_CLASS[order.status] ?? ""}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-[9px] text-muted">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center font-sans text-sm text-dark/50">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ---- print labels (hidden on screen, shown via window.print()) ---- */}
      <div className="hidden print:block">
        {orders.map((order) => (
          <div key={order.id} className="boo-label">
            <p className="boo-label-title">🎃 {SIZES[order.size].label} basket</p>
            <p>{nameFor(order)}{order.is_gift ? ` (gift for ${order.gift_recipient_name ?? "—"})` : ""}</p>
            <p>{LOCATION_LABEL[order.location]} · {order.payment_method === "auto_charge" ? "auto-charge" : "tap to pay"}</p>
            <p>bonnet: {order.bonnet_color}</p>
            <p>tool: {TOOL_LABEL[order.tool]}</p>
            <p>beanie: {order.beanie ? order.beanie_color ?? "yes" : "no"}</p>
            <p>candy: {order.candy ? "yes" : "no"}</p>
            <p>minis: {order.minis.join(", ")}{order.extra_minis > 0 ? ` (+${order.extra_minis} extra)` : ""}</p>
            {order.full_size_product && <p>full-size: {order.full_size_product}</p>}
            {order.golden_ticket && <p className="boo-label-golden">🎟️ GOLDEN TICKET</p>}
          </div>
        ))}
      </div>
      <style>{`
        @media print {
          .boo-label {
            border: 1px solid #000;
            padding: 12px;
            margin-bottom: 10px;
            page-break-inside: avoid;
            font-family: monospace;
            font-size: 11px;
          }
          .boo-label-title { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
          .boo-label-golden { font-weight: bold; margin-top: 4px; }
        }
      `}</style>
    </main>
  );
}
