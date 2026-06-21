"use client";

/**
 * OAUTH CALLBACK PAGE
 *
 * Håndterer PKCE callback fra Google/Microsoft OAuth.
 * - Eksplisitt exchangeCodeForSession (PKCE)
 * - Locale-aware redirect (bruker URL-path, ikke hardkodet /no)
 * - Error-redirect til /{locale}/login?error=... istedenfor inline feil
 * - Client-only render guard for å unngå hydration mismatch (#418)
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient, resetInvalidTokenGuard } from "@/lib/supabase/client";

export const runtime = 'nodejs';

// Module-level guard — survives React Strict Mode double-mounting
const handledCodes = new Set<string>();

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();

  // Hent locale fra URL-path (/no/callback → 'no')
  const locale = pathname?.split("/")[1] || "no";

  useEffect(() => {
    // Read params directly from URL for stability (avoids re-fire on searchParams ref change)
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    const cacheKey = `${code || errorParam || "none"}-${pathname}`;

    // Guard 1: Module-level — survives React Strict Mode remounts
    if (handledCodes.has(cacheKey)) return;

    // Guard 2: sessionStorage — survives page reloads within same tab session
    const storageKey = `pkce-handled-${cacheKey}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(storageKey)) {
      return;
    }

    handledCodes.add(cacheKey);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(storageKey, Date.now().toString());
    }

    const handleCallback = async () => {
      const supabase = createClient();

      // 1. OAuth provider returnerte en feil (access_denied, etc.)
      if (errorParam) {
        const msg = encodeURIComponent(errorDescription || errorParam);
        router.replace(`/${locale}/login?error=${msg}`);
        return;
      }

      // 2. PKCE: Exchange authorization code for session (rate-limited by Supabase — guard above prevents duplicates)
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          const msg = encodeURIComponent(exchangeError.message || "exchange_failed");
          router.replace(`/${locale}/login?error=${msg}`);
          return;
        }
      }

      // 3. Reset stale invalid-token guard so getSession() doesn't return null
      // after a fresh successful login.
      resetInvalidTokenGuard();

      // 4. Verifiser at session faktisk eksisterer etter exchange
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const msg = encodeURIComponent(
          sessionError?.message || "Kunne ikke fullføre innlogging. Prøv igjen."
        );
        router.replace(`/${locale}/login?error=${msg}`);
        return;
      }

      // 5. Suksess → redirect til dashboard
      router.replace(`/${locale}/dashboard`);
    };

    handleCallback();
  }, []);

  // Render minimal placeholder during SSR/hydration to eliminate hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen bg-slate-950" data-testid="auth-callback-loading" />;
  }

  // Full spinner vises først etter mount (unngår React #418)
  return (
    <div
      data-testid="auth-callback-loading"
      className="min-h-screen flex items-center justify-center bg-slate-950 p-4"
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Fullfører innlogging...</h1>
        <p className="text-slate-400">Vennligst vent mens vi verifiserer din konto.</p>
      </div>
    </div>
  );
}
