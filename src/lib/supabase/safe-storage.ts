/**
 * SafeStorage: localStorage-wrapper som aldri kaster.
 * Håndterer korrupte UTF-8-sekvenser, ugyldig JSON, SSR og quota-feil.
 *
 * KRITISK: gotrue-js sin interne @supabase/storage bruker en hardkodet
 * intern wrapper — vår adapter brukes for APP-kode. Inline <script> i
 * <head> håndterer intern gotrue-js storage FØR React starter.
 */

function isCorrupt(value: string): boolean {
  // Test 1: UTF-8 validering
  try {
    const enc = new TextEncoder().encode(value)
    new TextDecoder('utf-8', { fatal: true }).decode(enc)
  } catch {
    return true
  }
  // Test 2: JSON validering (alle gotrue-tokens er JSON-objekter)
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      JSON.parse(value)
    } catch {
      return true
    }
  }
  return false
}

function nukeAllAuthKeys(): void {
  try {
    const keys = Object.keys(localStorage)
    keys
      .filter(k => k.startsWith('sb-'))
      .forEach(k => {
        try { localStorage.removeItem(k) } catch { /* noop */ }
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
      if (value !== null && isCorrupt(value)) {
        console.warn(`[SafeStorage] Korrupt verdi for ${key}, renser alle sb-*`)
        nukeAllAuthKeys()
        return null
      }
      return value
    } catch (err) {
      console.warn(`[SafeStorage] getItem feilet for ${key}:`, err)
      nukeAllAuthKeys()
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
