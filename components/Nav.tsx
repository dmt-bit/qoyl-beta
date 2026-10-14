"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TABS } from "@/lib/postTabs";
import { shouldShowRoutineNudge } from "@/lib/routineVisit";
import { supabase } from "@/lib/supabase";
import { BOO_EVENT } from "@/lib/boo/config";

const DESKTOP_CENTER_LINKS_BASE = [
  { href: "/style-match", label: "Style Match" },
  { href: "/travel", label: "Travel" },
  { href: "/posts", label: "Posts" },
  { href: "/how-we-score", label: "How We Score" },
];

// Seasonal, self-removing - hides itself the morning after pickup rather
// than needing a follow-up PR to take it back down. Computed inside the
// builder function (called on every render) rather than hoisted to a
// module-level constant, so it still re-evaluates if this tab stays open
// across the cutoff instant.
function isBooBasketLive(): boolean {
  return new Date() <= new Date(BOO_EVENT.navCutoff);
}

// Routine is free for everyone now - "My Routine" only needs a saved
// hair profile to be worth showing here (no profile yet keeps it out of
// the top nav, still reachable via the hamburger menu). Inserted between
// Style Match and Travel specifically, matching the request.
function buildDesktopCenterLinks(hasProfile: boolean) {
  const base = isBooBasketLive()
    ? [...DESKTOP_CENTER_LINKS_BASE, { href: "/boo", label: "🎃 Boo Basket" }]
    : DESKTOP_CENTER_LINKS_BASE;
  if (!hasProfile) return base;
  const [styleMatch, ...rest] = base;
  return [styleMatch, { href: "/routine", label: "My Routine" }, ...rest];
}

// Menu link labels differ slightly from TABS' own labels ("Straight" vs
// "Straight Hair") - built from TABS so the hrefs/keys can't drift out
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

function SearchIcon({ size = 18, className = "shrink-0 text-dark" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function HouseIcon({ size = 18, className = "shrink-0 text-dark" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75V21h13.5V9.75" />
    </svg>
  );
}

function SuitcaseIcon({ size = 18, className = "shrink-0 text-dark" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="7.5" width="16.5" height="11.25" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6a2.25 2.25 0 012.25-2.25h3A2.25 2.25 0 0115.75 6v1.5M3.75 12.75h16.5" />
    </svg>
  );
}

function ChevronIcon({ size = 16, className = "shrink-0 text-dark/30" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="text-dark">
      <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="text-dark">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PersonIcon({ size = 18, className = "shrink-0 text-dark" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CalendarIcon({ size = 18, className = "shrink-0 text-dark" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="1.5" />
      <path strokeLinecap="round" d="M3.75 9.75h16.5M8.25 3v3.75M15.75 3v3.75" />
    </svg>
  );
}

function GridIcon({ size = 18, className = "shrink-0 text-dark" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="3.75" width="6.5" height="6.5" rx="1" />
      <rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1" />
      <rect x="3.75" y="13.75" width="6.5" height="6.5" rx="1" />
      <rect x="13.75" y="13.75" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}

// Home ("/") has its own search-first hero now (see app/page.tsx,
// components/HomeHero.tsx) - the desktop nav there is intentionally
// minimal per that redesign: wordmark, sign in (or Dashboard once
// signed in), and a Style Match pill. Replaces the old persistent left
// side rail entirely; every other page keeps the full center-links nav
// below.
function HomeDesktopNav({ user, showRoutineNudge }: { user: unknown; showRoutineNudge: boolean }) {
  return (
    // h-16 (64px) explicit - the video collage hero (components/HeroCollage.tsx)
    // needs a real pixel number to calc its own height against on
    // desktop, same as it does against the mobile top bar's real 52px.
    <div className="hidden h-16 border-b border-bronze/20 px-6 sm:flex sm:items-center">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="shrink-0 font-serif text-xl font-bold lowercase text-dark">
          qoyl
        </Link>
        <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-sm">
          {user ? (
            <Link href="/dashboard" className="relative font-medium text-dark/70 transition-colors hover:text-dark">
              Dashboard
              {showRoutineNudge && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-0.5 h-1.5 w-1.5 rounded-full bg-bronze"
                />
              )}
            </Link>
          ) : (
            <Link href="/auth" className="font-medium text-bronze2 transition-colors hover:text-dark">
              Sign in
            </Link>
          )}
          <Link
            href="/style-match"
            className="whitespace-nowrap bg-bronze px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            Style Match
          </Link>
        </div>
      </div>
    </div>
  );
}

// Active tab now shows as a solid black pill (item 10) rather than a
// color-only icon change, so the icon itself has to flip to white to
// stay visible against that black background.
const BOTTOM_NAV_ACTIVE = "text-cream";
const BOTTOM_NAV_INACTIVE = "text-muted";

function BottomNavTab({
  href,
  label,
  active,
  icon,
  alwaysActive,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  // Style Match (center tab) is always shown as the black "anchor" tab
  // regardless of route (item 10), not just when it's the active page.
  alwaysActive?: boolean;
}) {
  const showActive = active || alwaysActive;
  return (
    <Link href={href} className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5">
      <div
        className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1 transition-colors ${
          showActive ? "bg-dark" : ""
        }`}
      >
        {icon}
        <span className={`font-sans text-[10px] ${showActive ? "text-cream" : BOTTOM_NAV_INACTIVE}`}>
          {label}
        </span>
      </div>
    </Link>
  );
}

// Calendar icon with a small bronze dot when this user has a routine to
// show (a saved profile - routine is free for everyone, so there's no
// lock state to signal anymore).
function RoutineTabIcon({ active, hasProfile }: { active: boolean; hasProfile: boolean }) {
  const colorClass = `shrink-0 ${active ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE}`;
  return (
    <span className="relative inline-flex">
      {hasProfile && (
        <span
          aria-hidden
          className={`absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
            active ? "bg-cream" : "bg-bronze"
          }`}
        />
      )}
      <CalendarIcon size={20} className={colorClass} />
    </span>
  );
}

// Persistent primary navigation on mobile - the pattern every major
// mobile app uses, replacing the old side-strip workaround entirely
// (see the removed HomeSideNavMobile/HomeMiniMenuButton). Rendered
// unconditionally from Nav() below so it appears on every page without
// needing to be added per-page; globals.css adds matching bottom
// padding to <body> on mobile so page content never sits behind it.
function BottomNav({
  pathname,
  user,
  hairProfile,
}: {
  pathname: string;
  user: unknown;
  hairProfile: unknown;
}) {
  const profileHref = !user ? "/auth" : hairProfile ? "/dashboard" : "/profile";
  const profileActive = pathname.startsWith("/dashboard") || pathname.startsWith("/profile");
  const searchActive = pathname.startsWith("/search");
  const styleActive = pathname.startsWith("/style-match");
  const routineActive = pathname.startsWith("/routine");
  // Was "Feed" - home is a search-first hero now (see app/page.tsx), not
  // a feed, so the tab is relabeled. Route/active-state logic unchanged.
  const feedActive = pathname === "/";

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-[100] flex border-t border-[#e8e8e8] bg-[#ffffff] sm:hidden"
      style={{ height: "calc(60px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <BottomNavTab
        href="/"
        label="Home"
        active={feedActive}
        icon={<HouseIcon size={20} className={`shrink-0 ${feedActive ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE}`} />}
      />
      <BottomNavTab
        href="/search"
        label="Search"
        active={searchActive}
        icon={<SearchIcon size={20} className={`shrink-0 ${searchActive ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE}`} />}
      />
      <BottomNavTab
        href="/style-match"
        label="Style"
        active={styleActive}
        alwaysActive
        icon={<SparkleIcon size={24} className={BOTTOM_NAV_ACTIVE} />}
      />
      <BottomNavTab
        href="/routine"
        label="Routine"
        active={routineActive}
        icon={<RoutineTabIcon active={routineActive} hasProfile={Boolean(hairProfile)} />}
      />
      <BottomNavTab
        href={profileHref}
        label="Profile"
        active={profileActive}
        icon={<PersonIcon size={20} className={`shrink-0 ${profileActive ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE}`} />}
      />
    </nav>
  );
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-bronze">
      {children}
    </p>
  );
}

// Every hamburger row is 52px tall with a bottom border for a larger,
// consistent tap target - icon rows (My Profile/Dashboard/Search/Style
// Match/Travel) pass `icon`; plain rows (feed filters, account, learn)
// omit it and just indent to align with the icon rows above them.
function MenuLink({
  href,
  label,
  icon,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex h-[52px] items-center gap-3 border-b border-[#e8e8e8] px-6 text-dark transition-colors hover:bg-[#f5f5f5]/50"
    >
      {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate font-sans text-sm text-dark">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream">
          {badge}
        </span>
      )}
      {!badge && <ChevronIcon />}
    </Link>
  );
}

// "My Routine" gets a visually heavier treatment than the plain rows
// around it - it's the app's core feature, still worth a heavier row
// even though it's free for everyone (no more subscriber-only badge).
function RoutineMenuLink({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href="/routine"
      onClick={onNavigate}
      className="flex h-[52px] items-center gap-3 border-b border-l-[3px] border-b-[#e8e8e8] border-l-bronze bg-[#f5f5f5] pl-[21px] pr-6 transition-colors hover:bg-[#332A22]"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <CalendarIcon size={20} className="shrink-0 text-bronze" />
      </span>
      <span className="flex-1 font-sans text-sm font-semibold text-dark">My Routine</span>
      <span className="shrink-0 rounded-full bg-green/15 px-2.5 py-1 text-[10px] font-semibold text-green">
        Free
      </span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, hairProfile } = useAuth();
  const hasProfile = Boolean(hairProfile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRoutineNudge, setShowRoutineNudge] = useState(false);

  // Re-checked whenever the profile resolves or the user navigates
  // (pathname changes) - the latter so the dot clears right after a
  // visit to /routine (which calls markRoutineVisited) without needing a
  // full page reload.
  useEffect(() => {
    setShowRoutineNudge(shouldShowRoutineNudge(user?.id ?? null, hasProfile));
  }, [user, hasProfile, pathname]);

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

  // The public Style Match summary page is a standalone shareable
  // document (see components/Footer.tsx's matching check) - a stylist
  // with no Qoyl account shouldn't see the app's own nav chrome around
  // someone else's client brief. /ai is the same shape of exception - a
  // standalone portfolio case study (app/ai/page.tsx) with its own
  // minimal header/footer built in, not meant to carry the app's bottom
  // nav/hamburger menu at all.
  if (pathname.startsWith("/style-match/summary/") || pathname === "/ai") return null;

  // The home page ("/") gets its own minimal desktop nav (see
  // HomeDesktopNav above) - every other page keeps the full center-links
  // nav. On mobile, every page (including home) shares the same
  // simplified top bar (wordmark + hamburger only) and the same fixed
  // BottomNav.
  const isHome = pathname === "/";

  return (
    <nav className="print-hide bg-white font-sans">
      {/* Mobile top nav - wordmark + hamburger only. Primary navigation
          (feed/search/style match/routine/profile) now lives in
          BottomNav below; the hamburger here is secondary navigation
          (feed filters by hair type, account, learn). */}
      <div className="flex items-center justify-between px-4 sm:hidden" style={{ height: "calc(52px + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
        <Link href="/" className="font-serif text-xl font-bold lowercase text-dark">
          qoyl
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex items-center justify-center p-1"
        >
          <HamburgerIcon />
        </button>
      </div>

      {isHome && <HomeDesktopNav user={user} showRoutineNudge={showRoutineNudge} />}

      {!isHome && (
      <>
      {/* Desktop: wordmark, center text links, sign-in/account on the right. */}
      <div className="hidden border-b border-bronze/20 px-6 py-4 sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="shrink-0 font-serif text-xl font-bold lowercase text-dark">
            qoyl
          </Link>

          <ul className="flex items-center gap-6">
            <li className="shrink-0">
              <Link
                href="/search"
                className="whitespace-nowrap bg-bronze px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Search a Product
              </Link>
            </li>
            {buildDesktopCenterLinks(hasProfile).map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors ${
                    isLinkActive(pathname, link.href)
                      ? "bg-dark text-cream"
                      : "text-dark/70 hover:text-dark"
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
                    isLinkActive(pathname, "/dashboard") ? "text-bronze2" : "text-dark/70 hover:text-dark"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className={`font-medium transition-colors ${
                    isLinkActive(pathname, "/profile") ? "text-bronze2" : "text-dark/70 hover:text-dark"
                  }`}
                >
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="font-medium text-bronze2 transition-colors hover:text-dark"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="font-medium text-bronze2 transition-colors hover:text-dark"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Full-screen mobile menu - always mounted, toggled via
          translate-x/opacity so the slide-in transition actually plays.
          Reused on the home page too - the mobile side rail's grid icon
          opens this exact same overlay. */}
      {/* z-[110], above BottomNav's z-[100] - otherwise the fixed bottom
          nav bar would peek through on top of this full-screen menu. */}
      <div className={`fixed inset-0 z-[110] sm:hidden ${menuOpen ? "" : "pointer-events-none"}`}>
        <div
          onClick={closeMenu}
          aria-hidden
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full overflow-y-auto bg-[#ffffff] transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4" style={{ height: "calc(52px + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}>
            <Link href="/" onClick={closeMenu} className="font-serif text-xl font-bold lowercase text-dark">
              qoyl
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

          <MenuSectionLabel>Your Hair</MenuSectionLabel>
          <MenuLink
            href="/profile"
            label="My Profile"
            icon={<PersonIcon size={20} />}
            badge={!hairProfile ? "Start here" : undefined}
            onNavigate={closeMenu}
          />
          <MenuLink href="/dashboard" label="My Dashboard" icon={<GridIcon size={20} />} onNavigate={closeMenu} />
          <RoutineMenuLink onNavigate={closeMenu} />

          <MenuSectionLabel>Tools</MenuSectionLabel>
          <MenuLink href="/search" label="Search a Product" icon={<SearchIcon size={20} />} onNavigate={closeMenu} />
          <MenuLink
            href="/style-match"
            label="Style Match"
            icon={<SparkleIcon size={20} className="shrink-0 text-bronze" />}
            badge="New"
            onNavigate={closeMenu}
          />
          <MenuLink href="/travel" label="Travel Kit" icon={<SuitcaseIcon size={20} />} onNavigate={closeMenu} />
          {isBooBasketLive() && (
            <MenuLink href="/boo" label="🎃 Boo Basket" onNavigate={closeMenu} />
          )}

          <MenuSectionLabel>The Feed</MenuSectionLabel>
          {TABS.map((tab) => (
            <MenuLink
              key={tab.key}
              href={tab.key === "all" ? "/posts" : `/posts?type=${tab.key}`}
              label={FEED_LABEL_OVERRIDES[tab.key] ?? tab.label}
              onNavigate={closeMenu}
            />
          ))}
          <MenuLink href="/events" label="Events" onNavigate={closeMenu} />

          <MenuSectionLabel>Account</MenuSectionLabel>
          {loading ? null : user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-[52px] w-full items-center gap-3 border-b border-[#e8e8e8] px-6 text-left font-sans text-sm text-dark transition-colors hover:bg-[#f5f5f5]/50"
            >
              Sign out
            </button>
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
                className="text-bronze2 underline underline-offset-2 hover:text-dark"
              >
                @clubqoyl
              </a>
              <a
                href="mailto:hey@qoyl.live"
                className="text-bronze2 underline underline-offset-2 hover:text-dark"
              >
                hey@qoyl.live
              </a>
            </div>
            <p className="mt-4 text-xs text-dark/40">© {new Date().getFullYear()} Qoyl</p>
          </div>
        </div>
      </div>

      <BottomNav pathname={pathname} user={user} hairProfile={hairProfile} />
    </nav>
  );
}
