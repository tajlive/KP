/**
 * Client-side encryption for API keys
 * Uses Web Crypto API for secure encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Derive encryption key from user password/secret
 * In production, this should use a secure key management system
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // For now, use environment variable as key material
  // TODO: Implement proper key management (e.g., AWS KMS, Vault)
  const keyMaterial = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  if (!keyMaterial) {
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY is not set. Encryption cannot proceed without a valid key.');
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);
  
  // Import raw key material
  const key = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', keyData),
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
  
  return key;
}

/**
 * Encrypt sensitive data (API secret)
 */
export async function encryptData(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );
  
  // Combine IV and ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt sensitive data
 */
export async function decryptData(encrypted: string): Promise<string> {
  const decoder = new TextDecoder();
  
  // Decode base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const key = await getEncryptionKey();
  
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  
  return decoder.decode(plaintext);
}

/**
 * Hash API key for safe display (show last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return apiKey;
  return `${'*'.repeat(apiKey.length - 4)}${apiKey.slice(-4)}`;
}
