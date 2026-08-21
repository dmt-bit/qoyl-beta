import { Resend } from "resend";

let client: Resend | null = null;

// RESEND_API_KEY may not be configured in every environment - callers
// should check for a null client and skip sending rather than throw.
export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}
