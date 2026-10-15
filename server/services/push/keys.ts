import { ECDH } from "node:crypto";

const MAX_KEY_LENGTH = 256;
const P256_POINT_BYTES = 65;
const AUTH_SECRET_BYTES = 16;

function decode(value: unknown): Buffer | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_KEY_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+=*$/.test(value)) return null;
  return Buffer.from(value, "base64url");
}

/**
 * Keys web-push can encrypt for (RFC 8291): p256dh is an uncompressed point on P-256,
 * auth a 16-byte secret. Anything else fails before any request, so it is never stored.
 */
export function hasValidKeys(p256dh: unknown, auth: unknown): boolean {
  const point = decode(p256dh);
  if (point?.length !== P256_POINT_BYTES || point[0] !== 0x04) return false;
  if (decode(auth)?.length !== AUTH_SECRET_BYTES) return false;
  try {
    ECDH.convertKey(point, "prime256v1");
    return true;
  } catch {
    return false;
  }
}
