import Link from "next/link";

export const metadata = {
  title: "Qoyl for Brands",
  description: "Real data on which products score well for real hair profiles.",
};

// Minimal - a footer link (see components/Footer.tsx) needed a real
// destination and none existed. No lead-gen form or CRM integration
// here since neither was asked for; a mailto keeps this honest about
// what actually happens on submit.
export default function ForBrandsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16 font-sans text-dark sm:px-6">
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-3xl font-semibold text-dark sm:text-4xl">For Brands</h1>
        <p className="mt-4 text-sm leading-relaxed text-dark/70">
          Qoyl scores every product in our catalog against real hair profiles — curl type,
          porosity, scalp condition, climate, and more. That means real data on which of your
          products score well, for whom, and why — plus which ingredients or formulations are
          holding a product back for specific hair types.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-dark/70">
          We work with brands on catalog placement, ingredient feedback, and access to
          compatibility data across our user base.
        </p>
        <a
          href="mailto:hey@qoyl.live?subject=Qoyl%20for%20Brands"
          className="mt-6 inline-block bg-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-bronze2"
        >
          get in touch →
        </a>
        <p className="mt-8 text-xs text-dark/40">
          <Link href="/" className="underline underline-offset-2 hover:text-dark/70">
            ← back to qoyl
          </Link>
        </p>
      </div>
    </main>
  );
}
