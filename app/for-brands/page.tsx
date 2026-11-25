import Link from "next/link";

export const metadata = {
  title: "Qoyl for Brands",
  description: "Join the Qoyl brand catalog. Your products, recommended by AI to the right customer at the right moment.",
};

export default function ForBrandsPage() {
  return (
    <main className="min-h-screen bg-[#0E0A06] font-sans text-[#F8F3EC]">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-[rgba(200,168,106,0.18)]">
        <Link href="/" className="font-serif text-lg tracking-[0.18em] uppercase text-[#F8F3EC]">Qoyl</Link>
        <a
          href="mailto:brands@qoyl.live?subject=Brand%20Membership"
          className="text-[11px] font-medium tracking-[0.1em] uppercase border border-[rgba(200,168,106,0.6)] text-[#C8A86A] px-5 py-2 hover:bg-[#C8A86A] hover:text-[#0E0A06] transition-colors"
        >
          Apply
        </a>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-2xl mx-auto text-center">
        <div className="inline-block text-[10px] font-medium tracking-[0.22em] uppercase text-[#C8A86A] border border-[rgba(200,168,106,0.35)] px-3 py-1 mb-8">
          Founding membership — now open
        </div>
        <h1 className="font-serif text-4xl sm:text-6xl font-light leading-tight text-[#F8F3EC] mb-6">
          Your products, matched to the<br />
          <span className="italic text-[#C8A86A]">right customer.</span>
        </h1>
        <p className="text-[#F8F3EC]/65 text-base leading-relaxed mb-10 max-w-lg mx-auto">
          Qoyl recommends products based on each user&apos;s curl type, texture, and style goal.
          Member brands appear in those recommendations — not as ads, but as the right answer.
        </p>
        <a
          href="mailto:brands@qoyl.live?subject=Brand%20Membership"
          className="inline-block bg-[#C8A86A] text-[#0E0A06] text-xs font-semibold tracking-[0.1em] uppercase px-10 py-4 hover:opacity-85 transition-opacity"
        >
          Apply for founding membership
        </a>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#C8A86A] mb-5">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-[rgba(200,168,106,0.18)] bg-[rgba(200,168,106,0.18)]">
          {[
            {
              n: "01",
              title: "User gets matched",
              body: "Qoyl's AI identifies their target style from a photo, then scores every catalog product against their curl type, porosity, and goals.",
            },
            {
              n: "02",
              title: "Your product surfaces",
              body: "Member products appear in the personalized shopping list, ranked by compatibility score. High-scoring products surface first — quality wins, not spend.",
            },
            {
              n: "03",
              title: "They add to Qoyl cart",
              body: "Users add directly to the Qoyl checkout. No Amazon redirect, no lost attribution. The sale routes through the Qoyl store.",
            },
            {
              n: "04",
              title: "Qoyl fulfills",
              body: "Member brands ship inventory to Qoyl. We handle fulfillment, the customer experience, and returns. You focus on the product.",
            },
          ].map((step) => (
            <div key={step.n} className="bg-[#16110C] p-8">
              <div className="font-serif text-5xl font-light text-[rgba(200,168,106,0.25)] mb-4">{step.n}</div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#F8F3EC] mb-2">{step.title}</h3>
              <p className="text-sm text-[#F8F3EC]/60 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Membership tiers */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#C8A86A] mb-2">Founding membership</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#F8F3EC] mb-10">
          Flat rate. No commission.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px border border-[rgba(200,168,106,0.18)] bg-[rgba(200,168,106,0.18)]">
          {/* Starter */}
          <div className="bg-[#16110C] p-7 flex flex-col">
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#C8A86A] mb-3">Starter</p>
            <p className="font-serif text-5xl font-light text-[#F8F3EC] mb-1">$99</p>
            <p className="text-xs text-[#F8F3EC]/40 mb-6">per month</p>
            <ul className="space-y-2.5 text-sm text-[#F8F3EC]/65 flex-1">
              {["Up to 5 products in catalog", "Compatibility scoring included", "Qoyl checkout integration", "Monthly performance report", "Founding rate locked for life"].map((f) => (
                <li key={f} className="flex gap-2.5 items-start">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C8A86A] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Growth — featured */}
          <div className="bg-[#1E1710] p-7 flex flex-col border-t-2 border-[#C8A86A] relative">
            <span className="absolute top-0 right-6 bg-[#C8A86A] text-[#0E0A06] text-[9px] font-semibold tracking-[0.14em] uppercase px-2.5 py-1">
              Most popular
            </span>
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#C8A86A] mb-3">Growth</p>
            <p className="font-serif text-5xl font-light text-[#F8F3EC] mb-1">$149</p>
            <p className="text-xs text-[#F8F3EC]/40 mb-6">per month</p>
            <ul className="space-y-2.5 text-sm text-[#F8F3EC]/65 flex-1">
              {["Up to 20 products in catalog", "Compatibility scoring included", "Qoyl checkout + fulfillment", "Brand logo on all product cards", "Weekly performance dashboard", "Founding rate locked for life"].map((f) => (
                <li key={f} className="flex gap-2.5 items-start">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C8A86A] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Partner */}
          <div className="bg-[#16110C] p-7 flex flex-col">
            <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#C8A86A] mb-3">Partner</p>
            <p className="font-serif text-3xl font-light text-[#F8F3EC] mb-1 pt-2">Let&apos;s talk</p>
            <p className="text-xs text-[#F8F3EC]/40 mb-6">custom arrangement</p>
            <ul className="space-y-2.5 text-sm text-[#F8F3EC]/65 flex-1">
              {["Unlimited products", "Priority placement in results", "Dedicated account support", "Co-marketing opportunities", "Custom data reporting"].map((f) => (
                <li key={f} className="flex gap-2.5 items-start">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C8A86A] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-xs text-[#F8F3EC]/30 mt-4 text-center">
          Founding rates are locked in for the life of your membership. We work with hair care brands and extension / fake hair brands.
        </p>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 max-w-lg mx-auto text-center">
        <div className="border border-[rgba(200,168,106,0.25)] bg-[#16110C] p-10">
          <h2 className="font-serif text-3xl font-light text-[#F8F3EC] mb-3">Ready to apply?</h2>
          <p className="text-sm text-[#F8F3EC]/55 mb-8 leading-relaxed">
            We review every application and reply within 3 business days. Founding spots are limited.
          </p>
          <a
            href="mailto:brands@qoyl.live?subject=Brand%20Membership"
            className="inline-block bg-[#C8A86A] text-[#0E0A06] text-xs font-semibold tracking-[0.1em] uppercase px-10 py-4 hover:opacity-85 transition-opacity"
          >
            Email brands@qoyl.live
          </a>
          <p className="text-[11px] text-[#F8F3EC]/30 mt-5">No payment required to apply.</p>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-[rgba(200,168,106,0.18)] px-6 py-8 text-center">
        <Link href="/" className="text-xs text-[#F8F3EC]/30 hover:text-[#F8F3EC]/60 transition-colors">
          ← back to qoyl
        </Link>
      </div>
    </main>
  );
}
