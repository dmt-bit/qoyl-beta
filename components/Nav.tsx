"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TABS } from "@/lib/postTabs";
import { supabase } from "@/lib/supabase";

const DESKTOP_CENTER_LINKS = [
  { href: "/style-match", label: "Style Match" },
  { href: "/travel", label: "Travel" },
  { href: "/posts", label: "Posts" },
  { href: "/how-we-score", label: "How We Score" },
];

// Menu link labels differ slightly from TABS' own labels ("Straight" vs
// "Straight Hair") -- built from TABS so the hrefs/keys can't drift out
// of sync with lib/postTabs.ts, with the hamburger menu's own wording
// layered on top.
const FEED_LABEL_OVERRIDES: Partial<Record<string, string>> = {
  all: "All Posts",
  straight: "Straight Hair",
  wavy: "Wavy Hair",
  curly: "Curly Hair",
  coily: "Coily Hair",
  mens: "Men's Hair",
};

function isLinkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="shrink-0 text-cream"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function SparkleIcon({ size = 14, className = "text-bronze" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`shrink-0 ${className}`}
    >
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM19 14l.9 2.6L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.4L19 14zM5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="text-cream">
      <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="text-cream">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function StyleMatchPill() {
  return (
    <Link
      href="/style-match"
      aria-label="Style Match"
      className="flex items-center gap-1 whitespace-nowrap rounded-[20px] border border-bronze px-[10px] py-[5px] text-bronze"
    >
      <SparkleIcon size={13} />
      <span className="hidden font-sans text-[11px] font-semibold min-[380px]:inline">
        Style Match
      </span>
    </Link>
  );
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-bronze">
      {children}
    </p>
  );
}

function MenuLink({
  href,
  label,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  badge?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center justify-between gap-3 border-b border-[#2C2420] px-6 py-4 text-base font-medium text-cream transition-colors hover:bg-[#2C2420]/50"
    >
      <span>{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dark">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, hairProfile } = useAuth();
  const [hasRoutineSubscription, setHasRoutineSubscription] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasRoutineSubscription(false);
      return;
    }
    let cancelled = false;

    fetch(`/api/purchases?user_id=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHasRoutineSubscription(Boolean(data.hasRoutineSubscription));
      })
      .catch(() => {
        if (!cancelled) setHasRoutineSubscription(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Full-screen menu shouldn't let the page behind it scroll.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="print-hide bg-dark font-sans">
      {/* Mobile: wordmark left, Search a Product + Style Match pills,
          hamburger opens the full-screen menu. Account access lives in
          that menu now -- no person icon here. */}
      <div className="flex h-[52px] items-center justify-between px-4 sm:hidden">
        <Link href="/" className="font-serif text-xl italic text-cream">
          Qoyl
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search a product"
            className="flex items-center gap-1 whitespace-nowrap rounded-full bg-bronze px-2.5 py-1.5 text-cream"
          >
            <SearchIcon size={13} />
            <span className="font-sans text-[11px] font-semibold">
              Search a Product
            </span>
          </Link>
          <StyleMatchPill />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center p-1"
          >
            <HamburgerIcon />
          </button>
        </div>
      </div>

      {/* Desktop: wordmark, center text links, sign-in/account on the right. */}
      <div className="hidden border-b border-bronze/20 px-6 py-4 sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="shrink-0 font-serif text-xl italic text-cream">
            Qoyl
          </Link>

          <ul className="flex items-center gap-6">
            <li className="shrink-0">
              <Link
                href="/search"
                className="whitespace-nowrap rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Search a Product
              </Link>
            </li>
            {DESKTOP_CENTER_LINKS.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className={`whitespace-nowrap text-sm font-medium transition-colors ${
                    isLinkActive(pathname, link.href)
                      ? "text-bronze2"
                      : "text-cream/70 hover:text-cream"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-sm">
            {loading ? null : user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`font-medium transition-colors ${
                    isLinkActive(pathname, "/dashboard") ? "text-bronze2" : "text-cream/70 hover:text-cream"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className={`font-medium transition-colors ${
                    isLinkActive(pathname, "/profile") ? "text-bronze2" : "text-cream/70 hover:text-cream"
                  }`}
                >
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="font-medium text-bronze2 transition-colors hover:text-cream"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="font-medium text-bronze2 transition-colors hover:text-cream"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen mobile menu -- always mounted, toggled via
          translate-x/opacity so the slide-in transition actually plays. */}
      <div className={`fixed inset-0 z-50 sm:hidden ${menuOpen ? "" : "pointer-events-none"}`}>
        <div
          onClick={closeMenu}
          aria-hidden
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full overflow-y-auto bg-[#1C1612] transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-[52px] items-center justify-between px-4">
            <Link href="/" onClick={closeMenu} className="font-serif text-xl italic text-cream">
              Qoyl
            </Link>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="flex items-center justify-center p-1"
            >
              <CloseIcon />
            </button>
          </div>

          <MenuSectionLabel>Main features</MenuSectionLabel>
          <MenuLink
            href="/profile"
            label="Build my hair profile"
            badge={!hairProfile ? "Start here" : undefined}
            onNavigate={closeMenu}
          />
          <MenuLink href="/search" label="Search a Product" onNavigate={closeMenu} />
          <MenuLink href="/style-match" label="Style Match" badge="New" onNavigate={closeMenu} />
          <MenuLink href="/travel" label="Travel Kit" onNavigate={closeMenu} />
          {hasRoutineSubscription && (
            <MenuLink href="/routine" label="My Routine" onNavigate={closeMenu} />
          )}
          <MenuLink href="/dashboard" label="My Dashboard" onNavigate={closeMenu} />

          <MenuSectionLabel>The Feed</MenuSectionLabel>
          {TABS.map((tab) => (
            <MenuLink
              key={tab.key}
              href={tab.key === "all" ? "/posts" : `/posts?type=${tab.key}`}
              label={FEED_LABEL_OVERRIDES[tab.key] ?? tab.label}
              onNavigate={closeMenu}
            />
          ))}

          <MenuSectionLabel>Account</MenuSectionLabel>
          {loading ? null : user ? (
            <>
              <MenuLink href="/profile" label="My Profile" onNavigate={closeMenu} />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center justify-between border-b border-[#2C2420] px-6 py-4 text-left text-base font-medium text-cream transition-colors hover:bg-[#2C2420]/50"
              >
                Sign out
              </button>
            </>
          ) : (
            <MenuLink href="/auth" label="Sign in" onNavigate={closeMenu} />
          )}

          <MenuSectionLabel>Learn</MenuSectionLabel>
          <MenuLink href="/how-we-score" label="How We Score" onNavigate={closeMenu} />
          <MenuLink href="/privacy" label="Privacy Policy" onNavigate={closeMenu} />

          <div className="px-6 py-8">
            <div className="flex items-center gap-4 text-sm">
              <a
                href="https://www.instagram.com/clubqoyl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bronze2 underline underline-offset-2 hover:text-cream"
              >
                @clubqoyl
              </a>
              <a
                href="mailto:hey@qoyl.live"
                className="text-bronze2 underline underline-offset-2 hover:text-cream"
              >
                hey@qoyl.live
              </a>
            </div>
            <p className="mt-4 text-xs text-cream/40">© {new Date().getFullYear()} Qoyl</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
