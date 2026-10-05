import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Server-only (imports getSupabaseAdmin) - brand_accounts has RLS that
// blocks anon reads (it carries contact_name/email/stripe ids), so this
// can't be queried directly from app/search/page.tsx the way
// catalog_products/catalog_brands are - see app/api/brand-partners/route.ts,
// the public bridge that exposes just the derived boolean set.
//
// Schema correction from the request: brand_accounts has no brand_id
// column at all - there's nothing to JOIN brands.id against. The only
// shared identifier between the two tables is the brand's name
// (brand_accounts.company_name vs. catalog_brands.name), matched
// case-insensitively. Also, no row in brand_accounts has ever used
// status = 'active' - the real values in use are an application-style
// flow (pending/approved/rejected, etc.); 'approved' is the one that
// actually means "a legitimate brand account exists," so that's what
// this checks instead of the request's assumed 'active'.
export async function getPartnerBrandNames(): Promise<Set<string>> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("brand_accounts").select("company_name").eq("status", "approved");

  if (error) {
    console.error("[brandPartners] brand_accounts query failed:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.company_name.trim().toLowerCase()));
}
