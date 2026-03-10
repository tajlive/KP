/**
 * SafeStorage: localStorage-wrapper som aldri kaster.
 * Håndterer korrupte UTF-8-sekvenser, SSR og quota-feil gracefully.
 */

const _STORAGE_PREFIX = 'sb-vuxbjlykgmzskxbclquf'

function clearCorruptKeys(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => {
        try { localStorage.removeItem(k) } catch { /* ignorer */ }
      })
  } catch { /* noop */ }
}

export const safeStorage: {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null
      const value = localStorage.getItem(key)
      // Valider at verdien er gyldig JSON (ikke korrupt)
      if (value !== null) {
        try {
          // Sjekk om det er gyldig UTF-8 ved å encode/decode
          const encoded = new TextEncoder().encode(value)
          new TextDecoder('utf-8', { fatal: true }).decode(encoded)
        } catch {
          console.warn(`[SafeStorage] Korrupt verdi for ${key}, sletter`)
          clearCorruptKeys()
          return null
        }
      }
      return value
    } catch (err) {
      console.warn(`[SafeStorage] getItem feilet for ${key}:`, err)
      clearCorruptKeys()
      return null
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window === 'undefined') return
      localStorage.setItem(key, value)
    } catch (err) {
      console.warn(`[SafeStorage] setItem feilet for ${key}:`, err)
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return
      localStorage.removeItem(key)
    } catch (err) {
      console.warn(`[SafeStorage] removeItem feilet for ${key}:`, err)
    }
  },
}
