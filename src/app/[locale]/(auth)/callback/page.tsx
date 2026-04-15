"use client";

/**
 * OAUTH CALLBACK PAGE
 *
 * Håndterer PKCE callback fra Google/Microsoft OAuth.
 * - Eksplisitt exchangeCodeForSession (PKCE)
 * - Locale-aware redirect (bruker URL-path, ikke hardkodet /no)
 * - Error-redirect til /{locale}/login?error=... istedenfor inline feil
 */

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const handledRef = useRef(false);

  // Hent locale fra URL-path (/no/auth/callback → 'no')
  const locale = pathname?.split("/")[1] || "no";

  useEffect(() => {
    // Strict Mode guard: kjør bare én gang
    if (handledRef.current) return;
    handledRef.current = true;

    const handleCallback = async () => {
      const supabase = createClient();

      // 1. Google/Supabase returnerte en feil (access_denied, etc.)
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        const msg = encodeURIComponent(errorDescription || errorParam);
        router.replace(`/${locale}/login?error=${msg}`);
        return;
      }

      // 2. PKCE: Exchange authorization code for session
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          const msg = encodeURIComponent(exchangeError.message || "exchange_failed");
          router.replace(`/${locale}/login?error=${msg}`);
          return;
        }
      }

      // 3. Verifiser at session faktisk eksisterer etter exchange
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const msg = encodeURIComponent(
          sessionError?.message || "Kunne ikke fullføre innlogging. Prøv igjen."
        );
        router.replace(`/${locale}/login?error=${msg}`);
        return;
      }

      // 4. Suksess → redirect til dashboard
      router.replace(`/${locale}/dashboard`);
    };

    handleCallback();
  }, [router, searchParams, locale]);

  // Alltid vis spinner (redirect skjer i useEffect)
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
