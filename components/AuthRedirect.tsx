"use client";

// Redirects logged-in users to /dashboard as soon as the session is known.
// Renders nothing — purely a navigation side-effect.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthRedirect({ to }: { to: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(to);
    }
  }, [user, loading, router, to]);

  return null;
}
