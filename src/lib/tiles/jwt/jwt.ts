function base64UrlDecode(segment: string): Uint8Array {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeText(segment: string): string {
  return new TextDecoder().decode(base64UrlDecode(segment));
}

export interface DecodedJwt {
  headerRaw: string;
  payloadRaw: string;
  header: unknown;
  payload: unknown;
  headerB64: string;
  payloadB64: string;
  signatureB64: string;
}

/** Fields the JWT spec gives a defined meaning as a Unix timestamp (seconds). */
const TIME_FIELDS = ["exp", "iat", "nbf"];

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("A JWT has 3 dot-separated parts (header.payload.signature) - got " + parts.length);
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const headerRaw = base64UrlDecodeText(headerB64);
  const payloadRaw = base64UrlDecodeText(payloadB64);
  return {
    headerRaw,
    payloadRaw,
    header: JSON.parse(headerRaw),
    payload: JSON.parse(payloadRaw),
    headerB64,
    payloadB64,
    signatureB64,
  };
}

export function humanizeTimeFields(payload: unknown): { field: string; iso: string }[] {
  if (typeof payload !== "object" || payload === null) return [];
  const out: { field: string; iso: string }[] = [];
  for (const field of TIME_FIELDS) {
    const value = (payload as Record<string, unknown>)[field];
    if (typeof value === "number") {
      out.push({ field, iso: new Date(value * 1000).toISOString() });
    }
  }
  return out;
}

const HASH_BY_ALG: Record<string, string> = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

export function supportedAlg(alg: unknown): string | null {
  return typeof alg === "string" && alg in HASH_BY_ALG ? alg : null;
}

/** Verifies the HMAC signature locally via the Web Crypto API - no network, no server. */
export async function verifyHmac(decoded: DecodedJwt, secret: string): Promise<boolean> {
  const alg = supportedAlg((decoded.header as Record<string, unknown>)?.alg);
  if (!alg) throw new Error("Only HS256 / HS384 / HS512 signatures can be verified locally");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: HASH_BY_ALG[alg] },
    false,
    ["verify"],
  );
  const data = new TextEncoder().encode(`${decoded.headerB64}.${decoded.payloadB64}`);
  const signature = base64UrlDecode(decoded.signatureB64);
  return crypto.subtle.verify("HMAC", key, signature as BufferSource, data);
}
