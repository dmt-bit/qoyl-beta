"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import type { CartItem } from "@/lib/styleCart";

// ─── Shipping form state ───────────────────────────────────────────────────
type ShippingForm = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const EMPTY_FORM: ShippingForm = {
  name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────
export default function StoreCheckoutPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [items, setItems]           = useState<CartItem[]>([]);
  const [cartId, setCartId]         = useState<string>("");
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [form, setForm]             = useState<ShippingForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<ShippingForm>>({});

  // Load shelf items when user is available
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/shelf?user_id=${user.id}`)
      .then((r) => r.json())
      .then((json) => {
        setCartId(json.cart_id ?? "");
        const purchasable = (json.items as CartItem[] ?? []).filter(
          (i) => i.product_type !== "tutorial" && (i.price_estimate ?? 0) > 0
        );
        setItems(purchasable);
      })
      .catch(() => setError("Could not load your shelf. Please try again."))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Derived totals
  const subtotal    = items.reduce((s, i) => s + (i.price_estimate ?? 0) * (i.quantity ?? 1), 0);
  const serviceFee  = subtotal * 0.1;
  const total       = subtotal + serviceFee;

  // ── Form validation ─────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Partial<ShippingForm> = {};
    if (!form.name.trim())        errs.name        = "Name is required";
    if (!form.line1.trim())       errs.line1       = "Street address is required";
    if (!form.city.trim())        errs.city        = "City is required";
    if (!form.state.trim())       errs.state       = "State is required";
    if (!form.postal_code.trim()) errs.postal_code = "ZIP is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit → /api/store/checkout ─────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!validate()) return;
    if (!user?.id || !user?.email) {
      setError("Please sign in to place an order.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email:   user.email,
          cart_id: cartId,
          items,
          shipping_address: {
            name:        form.name,
            line1:       form.line1,
            line2:       form.line2 || undefined,
            city:        form.city,
            state:       form.state,
            postal_code: form.postal_code,
            country:     form.country,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Failed to start checkout.");
      }
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  // ── Field helpers ────────────────────────────────────────────────────────
  function field(
    id: keyof ShippingForm,
    label: string,
    placeholder?: string,
    required = true
  ) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor={id} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
          textTransform: "uppercase", color: formErrors[id] ? "#C0392B" : "#7A6E65" }}>
          {label}{required && <span style={{ color: "#C8A86A", marginLeft: 2 }}>*</span>}
        </label>
        <input
          id={id}
          value={form[id]}
          onChange={(e) => { setForm((f) => ({ ...f, [id]: e.target.value })); setFormErrors((f) => ({ ...f, [id]: undefined })); }}
          placeholder={placeholder ?? label}
          style={{
            border: formErrors[id] ? "1.5px solid #C0392B" : "1.5px solid #E8E0D5",
            borderRadius: 10,
            padding: "11px 14px",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            background: "#FDFBF8",
            color: "#1A1510",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        {formErrors[id] && (
          <span style={{ fontSize: 11, color: "#C0392B" }}>{formErrors[id]}</span>
        )}
      </div>
    );
  }

  // ── Loading / empty / error states ───────────────────────────────────────
  if (!user) {
    return (
      <PageShell>
        <EmptyState
          title="Sign in to shop"
          body="Create a free account to build your shelf and check out through Qoyl."
          action={{ label: "Sign in", href: "/sign-in" }}
        />
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E8E0D5", borderTopColor: "#C8A86A",
            borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageShell>
    );
  }

  if (!items.length) {
    return (
      <PageShell>
        <EmptyState
          title="Your shelf has no priced items"
          body="Add products with prices to your shelf first, then come back to check out."
          action={{ label: "Back to my shelf", href: "/dashboard" }}
        />
      </PageShell>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <PageShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus { border-color: #C8A86A !important; box-shadow: 0 0 0 3px rgba(200,168,106,0.15); }
      `}</style>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Header */}
        <div style={{ padding: "28px 0 24px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none",
            cursor: "pointer", fontSize: 13, color: "#9A8E82", fontFamily: "inherit",
            padding: 0, marginBottom: 16, letterSpacing: "0.04em" }}>
            ← Back
          </button>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32,
            fontWeight: 300, color: "#1A1510", margin: 0, lineHeight: 1.1 }}>
            Your Qoyl Order
          </h1>
          <p style={{ fontSize: 13, color: "#7A6E65", marginTop: 6, lineHeight: 1.5 }}>
            We'll purchase every item on your behalf and ship it directly to you.
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>

          {/* Left — shipping + items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Shipping form */}
            <section style={{ background: "#FDFBF8", border: "1px solid #EAE4DC", borderRadius: 16, padding: "24px 22px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20,
                fontWeight: 400, color: "#1A1510", margin: "0 0 20px" }}>
                Ship to
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {field("name",        "Full name",       "Jane Smith")}
                {field("line1",       "Street address",  "123 Main St")}
                {field("line2",       "Apt / Suite",     "Apt 4B", false)}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px", gap: 12 }}>
                  {field("city",        "City",   "New York")}
                  {field("state",       "State",  "NY")}
                  {field("postal_code", "ZIP",    "10001")}
                </div>
              </div>
            </section>

            {/* Items list */}
            <section>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20,
                fontWeight: 400, color: "#1A1510", margin: "0 0 16px" }}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map((item, i) => (
                  <ItemRow key={item.product_id ?? i} item={item} />
                ))}
              </div>
            </section>
          </div>

          {/* Right — order summary */}
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ background: "#FDFBF8", border: "1px solid #EAE4DC", borderRadius: 16, padding: "22px 22px 24px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20,
                fontWeight: 400, color: "#1A1510", margin: "0 0 18px" }}>
                Order summary
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <SummaryRow label="Subtotal" value={fmtPrice(subtotal)} />
                <SummaryRow label="Qoyl fulfillment (10%)" value={fmtPrice(serviceFee)}
                  note="We shop, pack & ship your products" />
                <div style={{ borderTop: "1px solid #EAE4DC", margin: "6px 0" }} />
                <SummaryRow label="Total" value={fmtPrice(total)} bold />
              </div>

              {error && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: "#FEF2F2",
                  border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#C0392B" }}>
                  {error}
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={submitting}
                style={{
                  marginTop: 18,
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 100,
                  border: "none",
                  background: submitting ? "#D0C8BC" : "linear-gradient(135deg,#C8A86A,#A8863A)",
                  color: submitting ? "#A09888" : "#1A1510",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "opacity 0.2s",
                }}
              >
                {submitting && (
                  <div style={{ width: 16, height: 16, border: "2px solid #A09888",
                    borderTopColor: "#1A1510", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
                )}
                {submitting ? "Redirecting to payment..." : "Continue to payment"}
              </button>

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L8.6 4.5H12L9.3 6.8L10.6 10.5L7 8.2L3.4 10.5L4.7 6.8L2 4.5H5.4L7 1Z"
                    fill="none" stroke="#C8A86A" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11, color: "#9A8E82" }}>Secured by Stripe · We shop for you</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F9F5F0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function ItemRow({ item }: { item: CartItem }) {
  const qty = item.quantity ?? 1;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center",
      background: "white", borderRadius: 12, padding: "12px 14px",
      border: "1px solid #EAE4DC" }}>
      {item.image_url ? (
        <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0, position: "relative" }}>
          <Image src={item.image_url} alt={item.product_name} fill style={{ objectFit: "cover" }} sizes="48px" />
        </div>
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: 8, background: "#EAE4DC",
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="7" y="4" width="6" height="12" rx="3" fill="#C8B896" />
          </svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1A1510",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.product_name}
        </p>
        {item.secondary_category_labels?.[0] && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9A8E82" }}>
            {item.secondary_category_labels[0].charAt(0).toUpperCase() + item.secondary_category_labels[0].slice(1)}
          </p>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#1A1510" }}>
          {item.price_estimate != null ? fmtPrice(item.price_estimate * qty) : "—"}
        </p>
        {qty > 1 && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9A8E82" }}>×{qty}</p>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, note, bold }: {
  label: string; value: string; note?: string; bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <div>
        <span style={{ fontSize: bold ? 15 : 13, color: bold ? "#1A1510" : "#7A6E65",
          fontWeight: bold ? 500 : 400 }}>{label}</span>
        {note && <p style={{ margin: "1px 0 0", fontSize: 10, color: "#B0A898" }}>{note}</p>}
      </div>
      <span style={{ fontSize: bold ? 15 : 13, color: bold ? "#1A1510" : "#7A6E65",
        fontWeight: bold ? 500 : 400, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function EmptyState({ title, body, action }: {
  title: string; body: string; action?: { label: string; href: string };
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: 400, textAlign: "center", padding: "0 24px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EAE4DC",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#9A8E82" strokeWidth="1.5"/>
          <line x1="3" y1="6" x2="21" y2="6" stroke="#9A8E82" strokeWidth="1.5"/>
          <path d="M16 10a4 4 0 01-8 0" stroke="#9A8E82" strokeWidth="1.5"/>
        </svg>
      </div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24,
        fontWeight: 400, color: "#1A1510", margin: "0 0 10px" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#7A6E65", margin: "0 0 24px", maxWidth: 300, lineHeight: 1.6 }}>{body}</p>
      {action && (
        <a href={action.href} style={{ padding: "11px 28px", borderRadius: 100,
          background: "linear-gradient(135deg,#C8A86A,#A8863A)", color: "#1A1510",
          textDecoration: "none", fontSize: 13, fontWeight: 500, letterSpacing: "0.06em" }}>
          {action.label}
        </a>
      )}
    </div>
  );
}
