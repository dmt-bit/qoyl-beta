// lib/webPush.ts
// Server-side helper for sending Web Push notifications to Qoyl users.
//
// Usage:
//   import { sendPushToUser, sendPushToUsers } from "@/lib/webPush";
//
//   await sendPushToUser(userId, {
//     title: "your recommendations are ready",
//     body:  "see what scored highest for your hair",
//     url:   "/dashboard",
//   });
//
// Environment variables required (set in Vercel + .env.local):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — base64url EC public key
//   VAPID_PRIVATE_KEY             — base64url PKCS#8 EC private key
//   VAPID_SUBJECT                 — mailto: or https: contact URI

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;         // path to open on click (default "/dashboard")
  icon?: string;        // icon URL (default /icons/icon-192.png)
  tag?: string;         // collapse key — same tag replaces the old notification
  data?: Record<string, unknown>;
}

interface PushRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// ── VAPID signing ─────────────────────────────────────────────────────────────
// We implement a minimal VAPID JWT using the Web Crypto API (available in
// Node 18+ and the Vercel Edge runtime) so we don't need the `web-push` npm
// package (which pulls in deprecated crypto modules).

function base64urlEncode(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64url");
}

function base64urlDecode(str: string): ArrayBuffer {
  const b = Buffer.from(str, "base64url");
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

function toArrayBuffer(buf: ArrayBuffer | ArrayBufferLike): ArrayBuffer {
  if (buf instanceof ArrayBuffer) return buf;
  // SharedArrayBuffer or other: copy into a plain ArrayBuffer
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(new Uint8Array(buf as unknown as ArrayBuffer));
  return ab;
}

async function buildVapidJwt(audience: string): Promise<string> {
  const privKey = process.env.VAPID_PRIVATE_KEY!;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hey@qoyl.live";

  // Import the private key (PKCS#8 DER).
  const privKeyBuf = base64urlDecode(privKey);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privKeyBuf,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: now + 86400, sub: subject };

  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

  const toSign =
    base64urlEncode(toArrayBuffer(headerBytes.buffer)) +
    "." +
    base64urlEncode(toArrayBuffer(payloadBytes.buffer));

  const toSignBytes = new TextEncoder().encode(toSign);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    toSignBytes
  );

  return `${toSign}.${base64urlEncode(sig)}`;
}

async function buildVapidHeaders(endpoint: string): Promise<Record<string, string>> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience);
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

  return {
    Authorization: `vapid t=${jwt},k=${pubKey}`,
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "aes128gcm",
    TTL: "86400",
  };
}

// ── Encryption (RFC 8291) ────────────────────────────────────────────────────
// Encrypts the payload for a single subscription using the receiver's p256dh
// and auth keys as per the Web Push encryption spec (aes128gcm).

async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ body: Buffer; salt: Buffer }> {
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const receiverPubKey = await crypto.subtle.importKey(
    "raw",
    base64urlDecode(p256dhBase64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPubKey },
    serverKeyPair.privateKey,
    256
  );

  const authSecret = base64urlDecode(authBase64);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const serverPublicKeyRaw = await crypto.subtle.exportKey("raw", serverKeyPair.publicKey);

  // PRK using HKDF
  const prk = await crypto.subtle.importKey("raw", toArrayBuffer(sharedSecret), "HKDF", false, ["deriveBits"]);

  const authInfo = Buffer.concat([
    Buffer.from("Content-Encoding: auth\0"),
    Buffer.from([1]),
  ]);

  const prkExpanded = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: authSecret,
      info: authInfo,
    },
    prk,
    256
  );

  // Encryption key (context unused in aes128gcm but kept for spec reference)
  const _context = Buffer.concat([
    Buffer.from("P-256\0"),
    Buffer.from([0, 65]),
    Buffer.from(base64urlDecode(p256dhBase64) as ArrayBuffer),
    Buffer.from([0, 65]),
    Buffer.from(toArrayBuffer(serverPublicKeyRaw)),
  ]);
  void _context;

  const keyInfo = Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0"), Buffer.from([1])]);
  const cekInfo = Buffer.concat([Buffer.from("Content-Encoding: nonce\0"), Buffer.from([1])]);

  const ikm = await crypto.subtle.importKey("raw", toArrayBuffer(prkExpanded), "HKDF", false, ["deriveBits"]);

  const saltBuf = toArrayBuffer(salt.buffer);
  const [cekBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: saltBuf, info: keyInfo }, ikm, 128),
    crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: saltBuf, info: cekInfo }, ikm, 96),
  ]);

  const cek = await crypto.subtle.importKey("raw", toArrayBuffer(cekBits), "AES-GCM", false, ["encrypt"]);

  const payloadBytes = new TextEncoder().encode(payload);
  const plaintextBuf = new Uint8Array(payloadBytes.length + 1);
  plaintextBuf.set(payloadBytes);
  plaintextBuf[payloadBytes.length] = 2; // padding delimiter

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(nonceBits) }, cek, plaintextBuf);

  // Build the aes128gcm content-encoding header + ciphertext.
  const serverPubKeyBuf = Buffer.from(toArrayBuffer(serverPublicKeyRaw));
  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096, 0);

  const header = Buffer.concat([
    Buffer.from(salt),
    recordSize,
    Buffer.from([serverPubKeyBuf.length]),
    serverPubKeyBuf,
  ]);

  return {
    body: Buffer.concat([header, Buffer.from(toArrayBuffer(encrypted))]),
    salt: Buffer.from(salt),
  };
}

// ── Send a push to one subscription row ─────────────────────────────────────

async function sendPushToSubscription(
  row: PushRow,
  payload: PushPayload
): Promise<{ ok: boolean; expired?: boolean }> {
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
    icon: payload.icon ?? "/icons/icon-192.png",
    tag: payload.tag ?? "qoyl",
    data: payload.data,
  });

  let encryptedBody: Buffer;
  try {
    const { body: enc } = await encryptPayload(body, row.p256dh, row.auth);
    encryptedBody = enc;
  } catch (err) {
    console.error("[webPush] encryption failed:", err);
    return { ok: false };
  }

  const headers = await buildVapidHeaders(row.endpoint);

  let res: Response;
  try {
    res = await fetch(row.endpoint, {
      method: "POST",
      headers,
      body: new Uint8Array(encryptedBody),
    });
  } catch (err) {
    console.error("[webPush] fetch failed:", err);
    return { ok: false };
  }

  if (res.status === 410 || res.status === 404) {
    // Subscription expired or unregistered — caller should remove it.
    return { ok: false, expired: true };
  }

  if (!res.ok) {
    console.warn("[webPush] push service returned", res.status, await res.text().catch(() => ""));
    return { ok: false };
  }

  return { ok: true };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Send a push notification to all subscribed devices for one user. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const admin = getSupabaseAdmin();

  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!rows || rows.length === 0) return { sent: 0, failed: 0 };

  return sendPushToRows(rows as PushRow[], payload, admin);
}

/** Send a push notification to all subscribed devices for a list of users. */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const admin = getSupabaseAdmin();
  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!rows || rows.length === 0) return { sent: 0, failed: 0 };

  return sendPushToRows(rows as PushRow[], payload, admin);
}

/** Send a push to ALL subscribed users (broadcast). Use sparingly. */
export async function broadcastPush(
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const admin = getSupabaseAdmin();
  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .limit(5000); // safety cap

  if (!rows || rows.length === 0) return { sent: 0, failed: 0 };

  return sendPushToRows(rows as PushRow[], payload, admin);
}

async function sendPushToRows(
  rows: PushRow[],
  payload: PushPayload,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  // Send in parallel (up to 10 at a time to avoid overwhelming push services).
  const CONCURRENCY = 10;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((row) => sendPushToSubscription(row, payload)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.ok) {
        sent++;
      } else {
        failed++;
        if (result.expired) expiredEndpoints.push(batch[j].endpoint);
      }
    }
  }

  // Prune dead subscriptions.
  if (expiredEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return { sent, failed };
}
