/**
 * Edge-safe encryption for the support impersonation cookie.
 *
 * Uses Web Crypto API (AES-256-GCM) so the module works in both Node.js API
 * routes and Next.js Edge middleware. The key is derived from
 * IMPERSONATION_SECRET via SHA-256; the secret must be kept separate from
 * NEXTAUTH_SECRET and Supabase JWT secrets.
 *
 * Cookie format: v1.<base64url(iv || ciphertext || tag)>
 */

export interface ImpersonationTokenPayload {
  accessToken: string;
  refreshToken: string;
  jti: string;
  targetUserId: string;
  expiresAt: string; // ISO 8601
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", keyData, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptImpersonationToken(
  payload: ImpersonationTokenPayload,
  secret: string,
): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  const cipherBytes = ArrayBuffer.isView(ciphertext)
    ? new Uint8Array(ciphertext.buffer, ciphertext.byteOffset, ciphertext.byteLength)
    : new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv);
  combined.set(cipherBytes, iv.length);
  return `v1.${bufferToBase64Url(combined)}`;
}

export async function decryptImpersonationToken(
  encrypted: string,
  secret: string,
): Promise<ImpersonationTokenPayload | null> {
  try {
    if (!encrypted.startsWith("v1.")) return null;
    const combined = new Uint8Array(base64UrlToBuffer(encrypted.slice(3)));
    if (combined.length < 13) return null;
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext)) as ImpersonationTokenPayload;
  } catch {
    return null;
  }
}
