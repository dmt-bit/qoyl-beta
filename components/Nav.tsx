"use client";

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="print-hide border-b border-bronze/20 bg-dark px-4 py-4 font-sans sm:px-6">
      <ul className="mx-auto flex max-w-3xl items-center gap-6">
        {PLAIN_LINKS.map((link) => (
          <li key={link.href}>
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

        <li>
          <Link
            href="/search"
            className="rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-bronze2"
          >
            Product Search
          </Link>
        </li>

        {TAIL_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
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

        <li className="ml-auto flex items-center gap-3 text-sm">
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
    </nav>
  );
}
