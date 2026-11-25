"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderConfirmedInner() {
  const params  = useSearchParams();
  const orderId = params.get("order_id");
  const [copied, setCopied] = useState(false);

  async function copyId() {
    if (!orderId) return;
    try { await navigator.clipboard.writeText(orderId); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9F5F0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px 80px",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 80% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Gold ring check */}
      <div style={{ animation: "pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards", marginBottom: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%",
          border: "2.5px solid #C8A86A",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 32px rgba(200,168,106,0.25)" }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16l7 7 13-13" stroke="#C8A86A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Headline */}
      <div style={{ animation: "fadeUp 0.5s 0.15s ease both", textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 36,
          fontWeight: 300, color: "#1A1510", margin: "0 0 10px", lineHeight: 1.1 }}>
          Order received
        </h1>
        <p style={{ fontSize: 15, color: "#7A6E65", margin: "0 0 32px", lineHeight: 1.6 }}>
          We&apos;re on it. The Qoyl team will purchase every item on your shelf
          and ship them directly to your door.
        </p>
      </div>

      {/* Steps */}
      <div style={{ animation: "fadeUp 0.5s 0.3s ease both", width: "100%", maxWidth: 380 }}>
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #EAE4DC",
          padding: "22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { n: 1, title: "Payment confirmed", desc: "Your card has been charged securely via Stripe." },
            { n: 2, title: "Qoyl shops for you", desc: "Our team sources your products from each retailer." },
            { n: 3, title: "Ships to your door", desc: "You'll get a tracking number once your order ships." },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%",
                background: "rgba(200,168,106,0.12)", border: "1.5px solid rgba(200,168,106,0.4)",
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600, color: "#A8863A" }}>
                {n}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#1A1510" }}>{title}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9A8E82", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Order ID */}
        {orderId && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#F3EDE5", borderRadius: 10, padding: "10px 14px" }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#9A8E82" }}>Order ID</p>
              <p style={{ margin: 0, fontSize: 12, color: "#5A4E42", fontFamily: "monospace",
                marginTop: 2 }}>{orderId.slice(0, 20)}…</p>
            </div>
            <button onClick={copyId} style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: copied ? "#6A9A6A" : "#9A8E82", fontFamily: "inherit", padding: 0 }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* CTA */}
        <a href="/dashboard" style={{ display: "block", marginTop: 20, padding: "13px 0",
          borderRadius: 100, background: "linear-gradient(135deg,#C8A86A,#A8863A)",
          color: "#1A1510", textDecoration: "none", textAlign: "center",
          fontSize: 14, fontWeight: 500, letterSpacing: "0.06em", fontFamily: "inherit" }}>
          Back to my shelf
        </a>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <OrderConfirmedInner />
    </Suspense>
  );
}
