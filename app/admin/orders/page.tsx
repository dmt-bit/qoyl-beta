"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { CartItem } from "@/lib/styleCart";

type OrderStatus = "pending_payment" | "paid" | "fulfilling" | "shipped" | "completed" | "cancelled";

type StoreOrder = {
  id: string;
  created_at: string;
  user_id: string;
  cart_id: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal_usd: number;
  service_fee_usd: number;
  total_usd: number;
  shipping_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  stripe_session_id: string | null;
  tracking_number?: string | null;
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending_payment: { bg: "#FEF9C3", text: "#854D0E", label: "Pending payment" },
  paid:            { bg: "#DCFCE7", text: "#166534", label: "Paid — needs fulfillment" },
  fulfilling:      { bg: "#DBEAFE", text: "#1E40AF", label: "Fulfilling" },
  shipped:         { bg: "#F3E8FF", text: "#6B21A8", label: "Shipped" },
  completed:       { bg: "#F0FDF4", text: "#15803D", label: "Completed" },
  cancelled:       { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
};

function fmtPrice(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  paid:       "fulfilling",
  fulfilling: "shipped",
  shipped:    "completed",
};

// Guard — only Qoyl admin emails may access (extend as needed)
const ADMIN_EMAILS = ["thabo.a.mela@gmail.com"];

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [orders, setOrders]   = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<"all" | OrderStatus>("all");

  useEffect(() => {
    if (user && !ADMIN_EMAILS.includes(user.email ?? "")) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("store_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as StoreOrder[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId);
    const payload: Partial<StoreOrder> = { status };
    if (status === "shipped" && trackingInputs[orderId]) {
      payload.tracking_number = trackingInputs[orderId];
    }
    const { error } = await supabase.from("store_orders").update(payload).eq("id", orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...payload } : o));
    }
    setUpdating(null);
  }

  const displayed = filterStatus === "all"
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  const stats = {
    total: orders.length,
    paid: orders.filter((o) => o.status === "paid").length,
    revenue: orders.filter((o) => ["paid","fulfilling","shipped","completed"].includes(o.status))
      .reduce((s, o) => s + o.total_usd, 0),
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#F9F5F0",
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: "0 0 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #EAE4DC", padding: "20px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28,
              fontWeight: 400, color: "#1A1510", margin: 0 }}>
              Order Management
            </h1>
            <p style={{ fontSize: 12, color: "#9A8E82", margin: "4px 0 0" }}>Qoyl Store — fulfillment dashboard</p>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <StatChip label="Total orders" value={String(stats.total)} />
            <StatChip label="Needs action" value={String(stats.paid)} accent />
            <StatChip label="Revenue" value={fmtPrice(stats.revenue)} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 28px" }}>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(["all", "paid", "fulfilling", "shipped", "completed", "cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: "7px 16px", borderRadius: 100,
                border: filterStatus === s ? "none" : "1px solid #DDD5C8",
                background: filterStatus === s ? "#1A1510" : "white",
                color: filterStatus === s ? "white" : "#7A6E65",
                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                letterSpacing: "0.04em",
              }}>
              {s === "all" ? "All" : (STATUS_COLORS[s]?.label ?? s)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #E8E0D5", borderTopColor: "#C8A86A",
              borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#9A8E82", fontSize: 15 }}>
            No orders yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {displayed.map((order) => {
              const statusMeta = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending_payment;
              const nextStatus = NEXT_STATUS[order.status];
              const isExpanded = expanded === order.id;

              return (
                <div key={order.id} style={{ background: "white", borderRadius: 14,
                  border: "1px solid #EAE4DC", overflow: "hidden" }}>

                  {/* Summary row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14,
                    padding: "16px 20px", cursor: "pointer" }}
                    onClick={() => setExpanded(isExpanded ? null : order.id)}>

                    {/* Status pill */}
                    <div style={{ padding: "4px 10px", borderRadius: 100,
                      background: statusMeta.bg, color: statusMeta.text,
                      fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                      whiteSpace: "nowrap" }}>
                      {statusMeta.label}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1A1510" }}>
                        {order.shipping_address?.name ?? "Unknown"} — {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9A8E82" }}>
                        {fmtDate(order.created_at)} · {order.id.slice(0, 12)}…
                      </p>
                    </div>

                    {/* Total */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "#1A1510" }}>
                        {fmtPrice(order.total_usd)}
                      </p>
                    </div>

                    {/* Chevron */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                      <path d="M4 6l4 4 4-4" stroke="#9A8E82" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #EAE4DC", padding: "20px 20px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

                        {/* Items */}
                        <div>
                          <h3 style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                            color: "#9A8E82", margin: "0 0 12px", fontWeight: 500 }}>Items to purchase</h3>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {order.items.map((item, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between",
                                alignItems: "center", padding: "10px 12px", background: "#F9F5F0",
                                borderRadius: 10, gap: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1A1510",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {item.product_name}
                                  </p>
                                  {item.secondary_category_labels?.[0] && (
                                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "#9A8E82" }}>{item.secondary_category_labels[0]}</p>
                                  )}
                                  {(item.affiliate_url ?? item.seller_url) && (
                                    <a href={item.affiliate_url ?? item.seller_url ?? "#"}
                                      target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: 11, color: "#C8A86A", display: "inline-block", marginTop: 2 }}>
                                      Buy link →
                                    </a>
                                  )}
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, color: "#1A1510" }}>
                                    {item.price_estimate != null ? fmtPrice(item.price_estimate * (item.quantity ?? 1)) : "—"}
                                  </p>
                                  {(item.quantity ?? 1) > 1 && (
                                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "#9A8E82" }}>×{item.quantity}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Totals */}
                          <div style={{ marginTop: 12, padding: "12px 12px", background: "#F3EDE5",
                            borderRadius: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                            <Row label="Subtotal" value={fmtPrice(order.subtotal_usd)} />
                            <Row label="Service fee" value={fmtPrice(order.service_fee_usd)} />
                            <div style={{ borderTop: "1px solid #DDD5C8", paddingTop: 6 }}>
                              <Row label="Total charged" value={fmtPrice(order.total_usd)} bold />
                            </div>
                          </div>
                        </div>

                        {/* Right column: shipping + actions */}
                        <div>
                          <h3 style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                            color: "#9A8E82", margin: "0 0 12px", fontWeight: 500 }}>Ship to</h3>
                          {order.shipping_address ? (
                            <div style={{ background: "#F9F5F0", borderRadius: 10, padding: "12px 14px",
                              fontSize: 13, color: "#1A1510", lineHeight: 1.7 }}>
                              <strong>{order.shipping_address.name}</strong><br />
                              {order.shipping_address.line1}<br />
                              {order.shipping_address.line2 && <>{order.shipping_address.line2}<br /></>}
                              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}<br />
                              {order.shipping_address.country}
                            </div>
                          ) : (
                            <p style={{ fontSize: 13, color: "#9A8E82" }}>
                              Address will be collected via Stripe shipping form.
                            </p>
                          )}

                          {/* Stripe session */}
                          {order.stripe_session_id && (
                            <div style={{ marginTop: 12 }}>
                              <p style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                                color: "#9A8E82", margin: "0 0 4px", fontWeight: 500 }}>Stripe session</p>
                              <a href={`https://dashboard.stripe.com/payments/${order.stripe_session_id}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 12, color: "#C8A86A", fontFamily: "monospace" }}>
                                {order.stripe_session_id.slice(0, 28)}…
                              </a>
                            </div>
                          )}

                          {/* Tracking number */}
                          {(order.status === "fulfilling" || order.status === "shipped") && (
                            <div style={{ marginTop: 16 }}>
                              <label style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                                color: "#9A8E82", fontWeight: 500, display: "block", marginBottom: 6 }}>
                                Tracking number
                              </label>
                              <input
                                value={trackingInputs[order.id] ?? order.tracking_number ?? ""}
                                onChange={(e) => setTrackingInputs((t) => ({ ...t, [order.id]: e.target.value }))}
                                placeholder="e.g. 1Z999AA10123456784"
                                style={{ width: "100%", border: "1.5px solid #DDD5C8", borderRadius: 8,
                                  padding: "9px 12px", fontSize: 13, fontFamily: "monospace",
                                  outline: "none", background: "#FDFBF8", color: "#1A1510" }}
                              />
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {nextStatus && (
                              <ActionButton
                                label={
                                  nextStatus === "fulfilling" ? "Mark fulfilling" :
                                  nextStatus === "shipped"    ? "Mark shipped" :
                                  "Mark completed"
                                }
                                onClick={() => updateStatus(order.id, nextStatus)}
                                loading={updating === order.id}
                                primary
                              />
                            )}
                            {order.status !== "cancelled" && order.status !== "completed" && (
                              <ActionButton
                                label="Cancel"
                                onClick={() => updateStatus(order.id, "cancelled")}
                                loading={updating === order.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 500,
        color: accent ? "#C0392B" : "#1A1510" }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: "#9A8E82", letterSpacing: "0.06em",
        textTransform: "uppercase" }}>{label}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: bold ? "#1A1510" : "#7A6E65", fontWeight: bold ? 500 : 400 }}>{label}</span>
      <span style={{ fontSize: 12, color: bold ? "#1A1510" : "#7A6E65", fontWeight: bold ? 500 : 400 }}>{value}</span>
    </div>
  );
}

function ActionButton({ label, onClick, loading, primary }: {
  label: string; onClick: () => void; loading: boolean; primary?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ padding: "8px 18px", borderRadius: 100, border: primary ? "none" : "1px solid #DDD5C8",
        background: primary ? "#1A1510" : "white", color: primary ? "white" : "#7A6E65",
        fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        opacity: loading ? 0.6 : 1 }}>
      {label}
    </button>
  );
}
