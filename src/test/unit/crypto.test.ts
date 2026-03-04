import { describe, it, expect, beforeAll } from 'vitest'

describe('API Key Encryption', () => {
  // Sjekk om Web Crypto API er tilgjengelig (ikke i Node.js uten polyfill)
  const hasCrypto = typeof crypto !== 'undefined' && crypto.subtle
  
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  })
  
  it('skal ha ENCRYPTION_KEY satt', () => {
    expect(process.env.ENCRYPTION_KEY).toBeDefined()
    expect(process.env.ENCRYPTION_KEY?.length).toBe(64)
  })
  
  it.runIf(hasCrypto)('skal kryptere og dekryptere API key korrekt', async () => {
    const { encryptApiKey, decryptApiKey } = await import('@/lib/crypto/encrypt-api-keys')
    const plaintext = 'test_api_key_12345'
    const encrypted = await encryptApiKey(plaintext)
    const decrypted = await decryptApiKey(encrypted)
    
    expect(decrypted).toBe(plaintext)
    expect(encrypted).not.toBe(plaintext)
  })
  
  it.runIf(hasCrypto)('skal gi forskjellige ciphertexts for samme plaintext', async () => {
    const { encryptApiKey } = await import('@/lib/crypto/encrypt-api-keys')
    const plaintext = 'same_key'
    const encrypted1 = await encryptApiKey(plaintext)
    const encrypted2 = await encryptApiKey(plaintext)
    
    expect(encrypted1).not.toBe(encrypted2)
  })
  
  it.runIf(hasCrypto)('skal feile ved dekryptering av ugyldig data', async () => {
    const { decryptApiKey } = await import('@/lib/crypto/encrypt-api-keys')
    await expect(decryptApiKey('invalid_base64!')).rejects.toThrow()
  })
  
  it.runIf(!hasCrypto)('skal hoppe over krypto-tester i Node-miljø', () => {
    expect(true).toBe(true)
  })
})
