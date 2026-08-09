/**
 * Kryptering av API-nøkler før lagring i database.
 * Bruker Web Crypto API — 100% edge-compatible (ingen Buffer).
 *
 * 2026-08-09 (P0): Buffer.from() krasjet i CF Workers edge-runtime
 * ("Buffer is not defined") → /api/trading/max-aggressive 500 i prod.
 * Byttet til rene Uint8Array/hex/base64-hjelpere.
 */

const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY' // 32-byte hex string

// ── Edge-safe helpers (erstatter Buffer) ──────────────────────────

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Generer ny encryption key (kjør én gang, lagre i env)
 */
export async function generateEncryptionKey(): Promise<string> {
  if (typeof crypto === 'undefined') {
    throw new Error('Web Crypto API ikke tilgjengelig')
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  const exported = await crypto.subtle.exportKey('raw', key)
  return bytesToHex(new Uint8Array(exported))
}

/**
 * Krypter API key
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  const encryptionKeyHex = process.env.ENCRYPTION_KEY

  if (!encryptionKeyHex) {
    throw new Error('ENCRYPTION_KEY ikke satt i environment variables')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(encryptionKeyHex),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  // Returner: iv + ciphertext som base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return bytesToBase64(combined)
}

/**
 * Dekrypter API key
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  const encryptionKeyHex = process.env.ENCRYPTION_KEY

  if (!encryptionKeyHex) {
    throw new Error('ENCRYPTION_KEY ikke satt')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(encryptionKeyHex),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const combined = base64ToBytes(encrypted)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}
