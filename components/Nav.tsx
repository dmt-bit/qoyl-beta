"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TABS } from "@/lib/postTabs";
import { shouldShowRoutineNudge } from "@/lib/routineVisit";
import { supabase } from "@/lib/supabase";

const DESKTOP_CENTER_LINKS_BASE = [
  { href: "/style-match", label: "Style Match" },
  { href: "/travel", label: "Travel" },
  { href: "/posts", label: "Posts" },
  { href: "/how-we-score", label: "How We Score" },
];

// "My Routine" only appears here for subscribers - non-subscribers keep
// it in the hamburger menu only (as an upgrade prompt) to avoid
// cluttering the top nav with a locked feature. Inserted between Style
// Match and Travel specifically, matching the request.
function buildDesktopCenterLinks(hasRoutineSubscription: boolean) {
  if (!hasRoutineSubscription) return DESKTOP_CENTER_LINKS_BASE;
  const [styleMatch, ...rest] = DESKTOP_CENTER_LINKS_BASE;
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

function SearchIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
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

function HouseIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75V21h13.5V9.75" />
    </svg>
  );
}

function SuitcaseIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="7.5" width="16.5" height="11.25" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6a2.25 2.25 0 012.25-2.25h3A2.25 2.25 0 0115.75 6v1.5M3.75 12.75h16.5" />
    </svg>
  );
}

function ChevronIcon({ size = 16, className = "shrink-0 text-cream/30" }: { size?: number; className?: string }) {
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

function PersonIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

// Wraps PersonIcon with an optional small bronze notification dot in the
// top-right corner - a gentle nudge for subscribers who haven't opened
// their routine in over 7 days (see lib/routineVisit.ts).
function PersonNavIcon({ size = 18, showDot = false }: { size?: number; showDot?: boolean }) {
  return (
    <span className="relative inline-flex">
      <PersonIcon size={size} />
      {showDot && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-bronze ring-2 ring-[#1C1612]"
        />
      )}
    </span>
  );
}

function CompassIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-3.5 1.5L10 14l3.5-1.5L15 9z" />
    </svg>
  );
}

function CalendarIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="1.5" />
      <path strokeLinecap="round" d="M3.75 9.75h16.5M8.25 3v3.75M15.75 3v3.75" />
    </svg>
  );
}

function LockIcon({ size = 16, className = "shrink-0 text-cream/50" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="4.5" y="10.5" width="15" height="9.75" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V7.5a4.5 4.5 0 119 0v3" />
    </svg>
  );
}

function GridIcon({ size = 18, className = "shrink-0 text-cream" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="3.75" width="6.5" height="6.5" rx="1" />
      <rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1" />
      <rect x="3.75" y="13.75" width="6.5" height="6.5" rx="1" />
      <rect x="13.75" y="13.75" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}

// The slim (mobile) / expanded (desktop) side rail shown only on the
// home page, replacing the top nav entirely there - every other page
function HomeSideNavDesktop({
  user,
  hasRoutineSubscription,
  showRoutineNudge,
  pathname,
}: {
  user: unknown;
  hasRoutineSubscription: boolean;
  showRoutineNudge: boolean;
  pathname: string;
}) {
  return (
    <div className="fixed bottom-0 left-0 top-0 z-50 hidden w-[200px] flex-col overflow-y-auto border-r border-bronze/40 bg-[#1C1612]/80 backdrop-blur-md sm:flex">
      <Link href="/" className="px-6 py-6 font-serif text-2xl italic text-cream">
        Qoyl
      </Link>

      <div className="flex flex-col gap-1 px-3">
        <SideNavLink href="/search" label="Search a Product" icon={<SearchIcon size={16} />} pathname={pathname} />
        <SideNavLink href="/style-match" label="Style Match" icon={<SparkleIcon size={16} className="text-cream" />} pathname={pathname} />
        <SideNavLink
          href={user ? "/dashboard" : "/auth"}
          label="Dashboard"
          icon={<PersonNavIcon size={16} showDot={showRoutineNudge} />}
          pathname={pathname}
        />
        <SideNavLink href="/travel" label="Travel Kit" icon={<CompassIcon size={16} />} pathname={pathname} />
        {hasRoutineSubscription && (
          <SideNavLink href="/routine" label="My Routine" icon={<CalendarIcon size={16} />} pathname={pathname} />
        )}
      </div>

      <p className="px-6 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.15em] text-bronze">
        The Feed
      </p>
      <div className="flex flex-col gap-1 px-3 pb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/posts" : `/posts?type=${tab.key}`}
            className="rounded-lg px-3 py-2 text-sm text-cream/70 transition-colors hover:bg-[#2C2420] hover:text-cream"
          >
            {FEED_LABEL_OVERRIDES[tab.key] ?? tab.label}
          </Link>
        ))}
      </div>

      {!user && (
        <div className="mt-auto px-3 pb-6">
          <Link
            href="/auth"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-bronze2 transition-colors hover:text-cream"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}

function SideNavLink({
  href,
  label,
  icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  pathname: string;
}) {
  const active = isLinkActive(pathname, href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-[#2C2420] text-cream" : "text-cream/70 hover:bg-[#2C2420]/60 hover:text-cream"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

const BOTTOM_NAV_ACTIVE = "text-bronze";
const BOTTOM_NAV_INACTIVE = "text-[#5A4A3A]";

function BottomNavTab({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center justify-center gap-1">
      {icon}
      <span className={`font-sans text-[10px] ${active ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE}`}>
        {label}
      </span>
    </Link>
  );
}

// Calendar icon with a small overlay signaling subscription state - a
// bronze dot above it when active, a tiny lock badge on it when not.
function RoutineTabIcon({
  active,
  hasRoutineSubscription,
}: {
  active: boolean;
  hasRoutineSubscription: boolean;
}) {
  const colorClass = `shrink-0 ${active ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE}`;
  return (
    <span className="relative inline-flex">
      {hasRoutineSubscription && (
        <span
          aria-hidden
          className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bronze"
        />
      )}
      <CalendarIcon size={20} className={colorClass} />
      {!hasRoutineSubscription && (
        <span className="absolute -bottom-0.5 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-dark">
          <LockIcon size={9} className={colorClass} />
        </span>
      )}
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
  hasRoutineSubscription,
}: {
  pathname: string;
  user: unknown;
  hairProfile: unknown;
  hasRoutineSubscription: boolean;
}) {
  const profileHref = !user ? "/auth" : hairProfile ? "/dashboard" : "/profile";
  const profileActive = pathname.startsWith("/dashboard") || pathname.startsWith("/profile");
  const searchActive = pathname.startsWith("/search");
  const styleActive = pathname.startsWith("/style-match");
  const routineActive = pathname.startsWith("/routine");
  const feedActive = pathname === "/";

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-[100] flex h-[60px] border-t border-[#2C2420] bg-[#1C1612] sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <BottomNavTab
        href="/"
        label="Feed"
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
        icon={<SparkleIcon size={24} className={styleActive ? BOTTOM_NAV_ACTIVE : BOTTOM_NAV_INACTIVE} />}
      />
      <BottomNavTab
        href="/routine"
        label="Routine"
        active={routineActive}
        icon={<RoutineTabIcon active={routineActive} hasRoutineSubscription={hasRoutineSubscription} />}
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
      className="flex h-[52px] items-center gap-3 border-b border-[#2C2420] px-6 text-cream transition-colors hover:bg-[#2C2420]/50"
    >
      {icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate font-sans text-sm text-cream">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-bronze px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dark">
          {badge}
        </span>
      )}
      {!badge && <ChevronIcon />}
    </Link>
  );
}

// "My Routine" gets a visually heavier treatment than the plain rows
// around it - it's the core paid product, so it should read as either
// an owned feature (subscriber) or an aspirational upgrade (everyone
// else), never just another list item. Always rendered (unlike an
// earlier subscriber-only conditional) so non-subscribers see and can
// tap into the upgrade path from the menu itself.
function RoutineMenuLink({
  hasRoutineSubscription,
  onNavigate,
}: {
  hasRoutineSubscription: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href="/routine"
      onClick={onNavigate}
      className="flex h-[52px] items-center gap-3 border-b border-l-[3px] border-b-[#2C2420] border-l-bronze bg-[#2C2420] pl-[21px] pr-6 transition-colors hover:bg-[#332A22]"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <CalendarIcon size={20} className="shrink-0 text-bronze" />
      </span>
      <span className="flex-1 font-sans text-sm font-semibold text-cream">My Routine</span>
      {hasRoutineSubscription ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[10px] font-semibold text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" />
          Active
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-bronze px-2.5 py-1 text-[10px] font-semibold text-dark">
          $7.99/mo
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
  const [showRoutineNudge, setShowRoutineNudge] = useState(false);

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

  // Re-checked whenever subscription status resolves or the user
  // navigates (pathname changes) - the latter so the dot clears right
  // after a visit to /routine (which calls markRoutineVisited) without
  // needing a full page reload.
  useEffect(() => {
    setShowRoutineNudge(shouldShowRoutineNudge(user?.id ?? null, hasRoutineSubscription));
  }, [user, hasRoutineSubscription, pathname]);

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

  // The home page ("/") still replaces the desktop top nav with a
  // persistent left side rail (see HomeSideNavDesktop above) - but on
  // mobile, every page (including home) now shares the same simplified
  // top bar (wordmark + hamburger only) and the same fixed BottomNav;
  // the old mobile-only side-strip workaround is gone entirely.
  const isHome = pathname === "/";

  return (
    <nav className="print-hide bg-dark font-sans">
      {/* Mobile top nav - wordmark + hamburger only. Primary navigation
          (feed/search/style match/routine/profile) now lives in
          BottomNav below; the hamburger here is secondary navigation
          (feed filters by hair type, account, learn). */}
      <div className="flex h-[52px] items-center justify-between px-4 sm:hidden">
        <Link href="/" className="font-serif text-xl italic text-cream">
          Qoyl
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

      {isHome && (
        <HomeSideNavDesktop
          user={user}
          hasRoutineSubscription={hasRoutineSubscription}
          showRoutineNudge={showRoutineNudge}
          pathname={pathname}
        />
      )}

      {!isHome && (
      <>
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
            {buildDesktopCenterLinks(hasRoutineSubscription).map((link) => (
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

          <MenuSectionLabel>Your Hair</MenuSectionLabel>
          <MenuLink
            href="/profile"
            label="My Profile"
            icon={<PersonIcon size={20} />}
            badge={!hairProfile ? "Start here" : undefined}
            onNavigate={closeMenu}
          />
          <MenuLink href="/dashboard" label="My Dashboard" icon={<GridIcon size={20} />} onNavigate={closeMenu} />
          <RoutineMenuLink hasRoutineSubscription={hasRoutineSubscription} onNavigate={closeMenu} />

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
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-[52px] w-full items-center gap-3 border-b border-[#2C2420] px-6 text-left font-sans text-sm text-cream transition-colors hover:bg-[#2C2420]/50"
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

      <BottomNav
        pathname={pathname}
        user={user}
        hairProfile={hairProfile}
        hasRoutineSubscription={hasRoutineSubscription}
      />
    </nav>
  );
}
