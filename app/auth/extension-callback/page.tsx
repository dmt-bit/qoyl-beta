"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// This page is the OAuth/magic-link redirect target when signing in from
// the Qoyl Chrome extension.  After Supabase confirms the session it
// sends the access token to the extension via postMessage, then closes
// this tab so the user lands back on whatever site they were shopping on.

export default function ExtensionCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    async function handleCallback() {
      // Supabase writes the session into localStorage automatically when
      // the page loads (it parses the hash / query params from the magic link).
      // Give it a moment then read the session.
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setStatus("error");
        return;
      }

      const { access_token, user } = data.session;

      // Fetch the user's curl type from their hair profile so the
      // extension popup can display it without an extra round-trip.
      let curlType: string | null = null;
      try {
        const { data: profile } = await supabase
          .from("hair_profiles")
          .select("curl_type")
          .eq("user_id", user.id)
          .maybeSingle();
        curlType = profile?.curl_type ?? null;
      } catch {
        // non-fatal — extension will just show generic state
      }

      const sessionData = {
        qoyl_access_token: access_token,
        qoyl_user_id: user.id,
        qoyl_email: user.email ?? "",
        qoyl_curl_type: curlType ?? "",
      };

      // Send to the extension.  The background service worker listens for
      // window messages from qoyl.live and saves the session.
      window.postMessage(
        { type: "QOYL_EXT_SESSION", data: sessionData },
        window.location.origin
      );

      setStatus("success");

      // Close this tab after a short delay so the user can see confirmation.
      setTimeout(() => {
        window.close();
      }, 1800);
    }

    handleCallback();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 font-sans text-dark">
      <div className="max-w-sm text-center">
        {status === "loading" && (
          <>
            <p className="font-serif text-2xl font-semibold text-dark">Signing you in…</p>
            <p className="mt-2 text-sm text-dark/60">Just a moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="font-serif text-2xl font-semibold text-dark">You&apos;re signed in!</p>
            <p className="mt-2 text-sm text-dark/60">
              This tab will close automatically. You can now use the Qoyl extension.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="font-serif text-2xl font-semibold text-dark">Something went wrong</p>
            <p className="mt-2 text-sm text-dark/60">
              Your sign-in link may have expired. Please try again from the extension.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
