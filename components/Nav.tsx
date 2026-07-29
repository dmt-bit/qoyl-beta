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
    <nav className="print-hide border-b border-bronze/20 bg-dark px-4 py-4 font-sans sm:px-6">
      <div className="relative mx-auto max-w-3xl">
        <ul
          style={{ WebkitOverflowScrolling: "touch" }}
          className="no-scrollbar flex items-center gap-4 overflow-x-auto sm:gap-6 sm:overflow-visible"
        >
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
              className="whitespace-nowrap rounded-lg bg-bronze px-2.5 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-bronze2 sm:px-4 sm:py-2 sm:text-sm"
            >
              Search a Product
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
                  <span className="hidden whitespace-nowrap rounded-full bg-bronze px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dark sm:inline-block">
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

          <li className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap pr-6 text-sm sm:pr-0">
            {loading ? null : user ? (
              <>
                <span className="hidden text-cream/60 sm:inline">
                  {user.email}
                </span>
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
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-r from-transparent to-dark sm:hidden" />
      </div>
    </nav>
  );
}
