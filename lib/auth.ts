/*
  PIN lock. The PIN lives in the TABZ_PIN env var (4 digits). A successful
  entry sets an HttpOnly session cookie holding an HMAC-signed expiry,
  keyed from the PIN itself, so changing the PIN invalidates every session.
  Uses Web Crypto so it runs in the proxy and in route handlers alike.
*/

export const SESSION_COOKIE = "tabz_session";
export const SESSION_DAYS = 90;

export function configuredPin(): string | null {
  const pin = process.env.TABZ_PIN?.trim();
  return pin && /^\d{4}$/.test(pin) ? pin : null;
}

const encoder = new TextEncoder();

async function hmacKey(pin: string): Promise<CryptoKey> {
  const secret = `tabz:${pin}:${process.env.TABZ_SECRET ?? ""}`;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(pin: string, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(pin), encoder.encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (no early exit on mismatch). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createToken(pin: string): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${expires}.${await sign(pin, String(expires))}`;
}

export async function verifyToken(token: string | undefined, pin: string): Promise<boolean> {
  if (!token) return false;
  const [expiresStr, sig] = token.split(".");
  if (!expiresStr || !sig) return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(sig, await sign(pin, expiresStr));
}
