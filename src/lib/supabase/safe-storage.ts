/**
 * SafeStorage: localStorage-wrapper som aldri kaster.
 * Håndterer korrupte UTF-8-sekvenser, ugyldig JSON, SSR og quota-feil.
 *
 * KRITISK: gotrue-js sin interne @supabase/storage bruker en hardkodet
 * intern wrapper — vår adapter brukes for APP-kode. Inline <script> i
 * <head> håndterer intern gotrue-js storage FØR React starter.
 */

// Debounce guard for å stoppe infinite loops
let lastClearTime = 0;
const CLEAR_DEBOUNCE_MS = 5000;

function isCorrupt(value: string): boolean {
  try {
    // Test 1: UTF-8 validering (kast aldri – Supabase kaster "Invalid UTF-8 sequence" ved korrupt data)
    const enc = new TextEncoder().encode(value)
    new TextDecoder('utf-8', { fatal: true }).decode(enc)
    // Test 2: JSON validering (alle gotrue-tokens er JSON-objekter)
    if (value.startsWith('{') || value.startsWith('[')) {
      JSON.parse(value)
    }
    return false
  } catch {
    return true
  }
}

const BOOTSTRAP_CLEANED_KEY = '__klarpakke_sb_storage_cleaned__'

/**
 * Synkron rens av korrupte Supabase-nøkler FØR createBrowserClient kalles.
 * Må kalles én gang per page load, f.eks. øverst i AuthProvider.
 * Unngår "Invalid UTF-8 sequence" fra gotrue-js ved å fjerne ugyldig data før lesing.
 */
export function clearCorruptSupabaseKeysSync(): void {
  if (typeof window === 'undefined') return
  try {
    if ((window as unknown as { [key: string]: boolean })[BOOTSTRAP_CLEANED_KEY]) return
    ;(window as unknown as { [key: string]: boolean })[BOOTSTRAP_CLEANED_KEY] = true
  } catch {
    return
  }

  const keysToRemove: string[] = []
  try {
    const n = localStorage.length
    for (let i = 0; i < n; i++) {
      let key: string | null = null
      try {
        key = localStorage.key(i)
      } catch {
        keysToRemove.length = 0
        for (let j = 0; j < localStorage.length; j++) {
          try {
            const k = localStorage.key(j)
            if (k && (k.startsWith('sb-') || k.includes('supabase') || k.includes('auth-token') || k.includes('gotrue')))
              keysToRemove.push(k)
          } catch { /* skip */ }
        }
        break
      }
      if (!key || (!key.startsWith('sb-') && !key.includes('supabase') && !key.includes('auth-token') && !key.includes('gotrue')))
        continue
      try {
        const val = localStorage.getItem(key)
        if (val !== null && isCorrupt(val)) {
          keysToRemove.push(key)
        }
      } catch {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch { /* ignore */ }
    })
    if (keysToRemove.length > 0) {
      console.warn('[SafeStorage] Ryddet korrupte nøkler før Supabase-init:', keysToRemove.length)
    }
  } catch { /* ignore */ }
}

export type ClearStorageOptions = {
  /** Ved true: renser nøkler men gjør IKKE location.reload(). Bruk ved korrupt auth så appen ikke går i reload-loop. */
  skipReload?: boolean;
};

/**
 * KRITISK: Rens ALLE Supabase auth-relaterte nøkler atomisk.
 * Dette stopper infinite loops hvor Supabase reloader fra andre nøkler.
 * Ved skipReload: true unngår vi reload (anbefalt ved "Invalid UTF-8" fra getSession).
 */
function clearAllSupabaseStorage(options?: ClearStorageOptions): void {
  const skipReload = options?.skipReload === true;
  const now = Date.now();

  // Debounce: ikke kjør mer enn én gang per 5 sekunder
  if (now - lastClearTime < CLEAR_DEBOUNCE_MS) {
    console.warn('[SafeStorage] Clear allerede kjørt nylig, ignorerer');
    return;
  }
  lastClearTime = now;

  console.warn('[SafeStorage] RENSER ALLE Supabase storage-nøkler...');

  // Finn og fjern alle Supabase auth-relaterte nøkler fra localStorage
  const keysToRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token') ||
        key.includes('gotrue')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.warn(`[SafeStorage] Fjernet: ${key}`);
      } catch { /* ignore */ }
    });
  } catch { /* ignore */ }

  // Rens også sessionStorage
  try {
    const ssKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token') ||
        key.includes('gotrue')
      )) {
        ssKeys.push(key);
      }
    }
    ssKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        console.warn(`[SafeStorage] Fjernet fra sessionStorage: ${key}`);
      } catch { /* ignore */ }
    });
  } catch { /* ignore */ }

  console.warn('[SafeStorage] Alle Supabase storage-nøkler ryddet');

  // Hard reload kun hvis vi ikke er i korrupt-auth-tilfelle (da forårsaker reload ofte loop)
  if (typeof window !== 'undefined' && !skipReload) {
    console.warn('[SafeStorage] Hard reload for å fullføre rensing...');
    window.location.reload();
  }
}

// Deprecated: behold for bakoverkompatibilitet
function nukeAllAuthKeys(): void {
  clearAllSupabaseStorage();
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
        console.warn(`[SafeStorage] Korrupt verdi for ${key}, renser alle nøkler`)
        clearAllSupabaseStorage({ skipReload: true })
        return null
      }
      return value
    } catch (err) {
      console.warn(`[SafeStorage] getItem feilet for ${key}:`, err)
      clearAllSupabaseStorage({ skipReload: true })
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

// Export for bruk i AuthContext og andre steder
export { clearAllSupabaseStorage, nukeAllAuthKeys };
