/**
 * Web Crypto helpers for OAuth PKCE and state validation.
 *
 * Uses the global `crypto` object so it works in both Node.js and Edge/Worker
 * runtimes without importing Node-specific modules.
 */

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  let output = "";

  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;
    const bitmap = (b1 << 16) | (b2 << 8) | b3;

    output += BASE64URL_ALPHABET.charAt((bitmap >> 18) & 63);
    output += BASE64URL_ALPHABET.charAt((bitmap >> 12) & 63);
    if (i + 1 < len) {
      output += BASE64URL_ALPHABET.charAt((bitmap >> 6) & 63);
    }
    if (i + 2 < len) {
      output += BASE64URL_ALPHABET.charAt(bitmap & 63);
    }
  }

  return output;
}

/** Generate a PKCE code verifier (32 random bytes, base64url). */
export function generateCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes.buffer);
}

/** Generate an S256 code challenge from a verifier. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

/** Generate an opaque OAuth state parameter. */
export function generateState(): string {
  return crypto.randomUUID();
}

/** Constant-time string comparison to mitigate timing attacks. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}
