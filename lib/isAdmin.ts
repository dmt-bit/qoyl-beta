import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// ADMIN_EMAILS is server-only (no NEXT_PUBLIC_ prefix), so this is never
// readable from client code - calling it in a "use client" component
// just always returns false, which is the safe failure mode.
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) ?? [];
  return adminEmails.includes(email.toLowerCase());
}

// For routes/functions that only have a user_id, not a verified email -
// looks the email up server-side via the service-role auth API rather
// than trusting a client-supplied email string. Trusting a raw email
// query param here would let anyone grant themselves the bypass just by
// typing an admin's address into a URL; a user_id is only ever attached
// to an admin's email if the caller actually owns that Supabase account.
export async function isAdminUserId(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (error || !data.user) return false;
    return isAdmin(data.user.email);
  } catch (err) {
    console.error("[isAdmin] Failed to look up user for admin check:", err);
    return false;
  }
}
