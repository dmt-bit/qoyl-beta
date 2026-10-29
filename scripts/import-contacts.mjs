// Bulk-imports a list of contacts as Supabase auth users with no
// password, so their first entry point into Qoyl is always the magic
// link sent from /auth (supabase.auth.signInWithOtp). They land in the
// app already signed in and get routed to /profile by the existing
// redirect in app/auth/page.tsx, since they won't have a hair_profiles
// row yet.
//
// Supabase doesn't support inserting directly into auth.users via SQL
// (it's not meant to be written to outside the Auth service - doing so
// skips the triggers/invariants the Auth API maintains). Creating users
// in bulk has to go through the Auth Admin API instead, which this
// script calls via supabase.auth.admin.createUser() using the
// service-role key (never the anon key - this bypasses the
// email-verification step real signups go through, so it must stay
// server-only).
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
//     node scripts/import-contacts.mjs contacts.csv
//
// contacts.csv: one email per line (a header row, if present, is
// skipped automatically - any line that isn't a plausible email is
// skipped and reported at the end).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const [, , csvPath] = process.argv;
if (!csvPath) {
  console.error("Usage: node scripts/import-contacts.mjs <contacts.csv>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const lines = readFileSync(csvPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const emails = [...new Set(lines.filter((l) => EMAIL_RE.test(l)))];
const skipped = lines.filter((l) => !EMAIL_RE.test(l));

console.log(`Found ${emails.length} valid email(s), skipping ${skipped.length} non-email line(s).`);

const created = [];
const failed = [];

for (const email of emails) {
  // email_confirm: true - these are pre-vetted contacts, not public
  // signups, so there's no confirmation email to send; their first
  // real action is clicking the magic link from /auth.
  const { error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error) {
    // already_exists isn't a real failure for a re-run of this script.
    if (error.message?.toLowerCase().includes("already been registered")) {
      console.log(`- ${email}: already exists, skipping`);
      continue;
    }
    console.error(`- ${email}: FAILED - ${error.message}`);
    failed.push({ email, error: error.message });
    continue;
  }

  console.log(`- ${email}: created`);
  created.push(email);
}

console.log(`\nDone. Created ${created.length}, failed ${failed.length}, skipped ${skipped.length} non-email line(s).`);
if (failed.length) {
  console.log("Failures:", JSON.stringify(failed, null, 2));
}
