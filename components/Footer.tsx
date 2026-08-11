import Link from "next/link";

export default function Footer() {
  return (
    <footer className="print-hide border-t border-bronze/20 bg-dark px-4 py-6 font-sans sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 text-xs text-cream/50 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Qoyl</p>
        <div className="flex items-center gap-4">
          <Link
            href="/how-we-score"
            className="text-cream/50 underline underline-offset-2 hover:text-cream/70"
          >
            How we score →
          </Link>
          <Link
            href="/privacy"
            className="text-cream/50 underline underline-offset-2 hover:text-cream/70"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-cream/40">
        Qoyl provides cosmetic hair care information only. Not a substitute
        for professional medical advice.
      </p>
    </footer>
  );
}
