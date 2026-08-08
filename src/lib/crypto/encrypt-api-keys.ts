/**
 * Kryptering av API-nøkler før lagring i database.
 * Bruker Web Crypto API (edge-compatible).
 */

const ENCRYPTION_KEY_ENV = 'ENCRYPTION_KEY' // 32-byte hex string

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
  return Buffer.from(exported).toString('hex')
}

/**
 * Krypter API key
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  const encryptionKeyHex = process.env.ENCRYPTION_KEY
  
  if (!encryptionKeyHex) {
    throw new Error('ENCRYPTION_KEY ikke satt i environment variables')
  }
  
  const keyData = Buffer.from(encryptionKeyHex, 'hex')
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
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
  
  return Buffer.from(combined).toString('base64')
}

/**
 * Dekrypter API key
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  const encryptionKeyHex = process.env.ENCRYPTION_KEY
  
  if (!encryptionKeyHex) {
    throw new Error('ENCRYPTION_KEY ikke satt')
  }
  
  const keyData = Buffer.from(encryptionKeyHex, 'hex')
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const combined = Buffer.from(encrypted, 'base64')
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  
  return new TextDecoder().decode(decrypted)
}
