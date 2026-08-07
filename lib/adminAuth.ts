// Lightweight shared-secret gate for /admin/products -- the client sends
// the password back on every request via the x-admin-password header
// (entered once, held in sessionStorage for that tab), and every admin
// API route checks it independently before touching the service role.
// Not session/cookie-based auth -- appropriate for a single internal
// admin password, not a multi-user permission system.
export function isAuthorizedAdmin(request: Request): boolean {
  const provided = request.headers.get("x-admin-password");
  return Boolean(process.env.ADMIN_PASSWORD) && provided === process.env.ADMIN_PASSWORD;
}
