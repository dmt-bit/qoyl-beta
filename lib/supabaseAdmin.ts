import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service role key, which bypasses Row
// Level Security. Only import this from server-side code (API routes,
// Server Components) -- never from a "use client" component, since the
// key must never reach the browser bundle.
let adminClient: SupabaseClient | null = null;

// Lazily instantiated so builds/page-data collection succeed even when
// SUPABASE_SERVICE_ROLE_KEY isn't set yet -- supabase-js throws
// immediately on construction if the key is empty, and that must not
// happen at module load time (e.g. import-time evaluation during
// `next build`).
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
      );
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey);
  }
  return adminClient;
}
