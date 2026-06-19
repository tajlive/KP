import "server-only";

/**
 * Server-side dekryptering av API secrets som ble kryptert med den
 * utgåtte client-side nøkkelen NEXT_PUBLIC_ENCRYPTION_KEY.
 *
 * Denne funksjonen beholdes utelukkende for bakoverkompatibilitet med
 * eksisterende rader i `api_keys`-tabellen. All ny lagring skal bruke
 * server-side kryptering via /api/binance/encrypt eller /api/exchanges/connections.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

async function getLegacyEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  if (!keyMaterial) {
    throw new Error(
      "NEXT_PUBLIC_ENCRYPTION_KEY is not set. Cannot decrypt legacy data.",
    );
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", keyData),
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["decrypt"],
  );

  return key;
}

/**
 * Dekrypterer en legacy client-side-kryptert API secret.
 * @param encrypted Base64-kodet IV + ciphertext (AES-256-GCM).
 */
export async function decryptLegacyApiSecret(
  encrypted: string,
): Promise<string> {
  const decoder = new TextDecoder();

  const combined = Uint8Array.from(atob(encrypted), (c) =>
    c.charCodeAt(0),
  );

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await getLegacyEncryptionKey();

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );

  return decoder.decode(plaintext);
}
