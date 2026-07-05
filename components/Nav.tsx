"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/profile", label: "My Profile" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-bronze/20 bg-dark px-4 py-4 font-sans sm:px-6">
      <ul className="mx-auto flex max-w-3xl items-center gap-6">
        {LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-bronze2"
                    : "text-cream/70 hover:text-cream"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
