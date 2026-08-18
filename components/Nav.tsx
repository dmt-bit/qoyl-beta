"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const PLAIN_LINKS = [{ href: "/", label: "Home" }];
const TAIL_LINKS = [
  { href: "/travel", label: "Traveling?" },
  { href: "/profile", label: "My Profile", badge: "Start here" },
];

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

function SparkleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="shrink-0 text-cream"
    >
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zM19 14l.9 2.6L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.4L19 14zM5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      className="text-cream"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [hasRoutineSubscription, setHasRoutineSubscription] = useState(false);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="print-hide bg-dark font-sans">
      {/* Mobile: wordmark left, search pill + person icon right. No
          borders -- everything else (Traveling?, My Routine, etc) lives
          on /dashboard instead of the nav bar on small screens. */}
      <div className="flex h-[52px] items-center justify-between px-4 sm:hidden">
        <Link href="/" className="font-serif text-xl italic text-cream">
          Qoyl
        </Link>
        <div className="flex items-center gap-3">
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
          <Link
            href="/style-match"
            aria-label="Style Match"
            className="flex items-center justify-center rounded-full border border-bronze/40 p-1.5"
          >
            <SparkleIcon size={15} />
          </Link>
          <Link
            href={loading ? "/auth" : user ? "/dashboard" : "/auth"}
            aria-label={user ? "My dashboard" : "Sign in"}
          >
            <PersonIcon />
          </Link>
        </div>
      </div>

      {/* Desktop: unchanged from the original nav -- wordmark, text
          links, bronze Search a Product button, sign in/out. */}
      <div className="hidden border-b border-bronze/20 px-6 py-4 sm:block">
        <div className="relative mx-auto max-w-3xl">
          <ul className="flex items-center gap-6">
            {PLAIN_LINKS.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isLinkActive(pathname, link.href)
                      ? "text-bronze2"
                      : "text-cream/70 hover:text-cream"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            <li className="shrink-0">
              <Link
                href="/search"
                className="whitespace-nowrap rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
              >
                Search a Product
              </Link>
            </li>

            <li className="shrink-0">
              <Link
                href="/style-match"
                className={`whitespace-nowrap text-sm font-medium transition-colors ${
                  isLinkActive(pathname, "/style-match")
                    ? "text-bronze2"
                    : "text-cream/70 hover:text-cream"
                }`}
              >
                Style Match
              </Link>
            </li>

            {TAIL_LINKS.map((link) => (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors ${
                    isLinkActive(pathname, link.href)
                      ? "text-bronze2"
                      : "text-cream/70 hover:text-cream"
                  }`}
                >
                  {link.label}
                  {link.badge && (
                    <span className="inline-block whitespace-nowrap rounded-full bg-bronze px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dark">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}

            {hasRoutineSubscription && (
              <li className="shrink-0">
                <Link
                  href="/routine"
                  className={`whitespace-nowrap text-sm font-medium transition-colors ${
                    isLinkActive(pathname, "/routine")
                      ? "text-bronze2"
                      : "text-cream/70 hover:text-cream"
                  }`}
                >
                  My Routine
                </Link>
              </li>
            )}

            <li className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
              {loading ? null : user ? (
                <>
                  <span className="text-cream/60">{user.email}</span>
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
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
