"use client";

/**
 * AUTH HASH HANDLER
 *
 * Håndterer tilfeller hvor Supabase redirecter til rot-URL
 * med access_token i hash (i stedet for å gå via /callback).
 *
 * SSR-safe: bruker IKKE useSearchParams() (som trigger hydration mismatch
 * uten Suspense-boundary). Leser URL-parametere fra window.location i useEffect.
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localizedPathname } from "@/middleware/locale-path";

export function AuthHashHandler() {
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run after mount and not on callback page
    if (!mounted) return;
    if (pathname?.includes("/callback")) return;
    // Double-check via window.location (defensive)
    if (typeof window !== "undefined" && window.location.pathname.includes("/callback")) {
      return;
    }

    // Read error from URL search params (client-only, avoids useSearchParams hydration issue)
    const url = new URL(window.location.href);
    const urlError = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (urlError) {
      console.error("[AuthHashHandler] OAuth error:", urlError, errorDescription);
      setError(errorDescription || "Autentisering ble avbrutt");
      setIsProcessing(false);
      return;
    }

    // Sjekk om det er auth-data i URL-hashen
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) {
      return;
    }
    const handleAuthHash = async () => {
      setIsProcessing(true);
      setError(null);
      const supabase = createClient();

      try {
        // Vent litt for å la Supabase klienten prosessere hash
        await new Promise(resolve => setTimeout(resolve, 500));

        // Sjekk om session allerede er satt
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        let session = initialSession;
        // Hvis fortsatt ingen session, prøv å parse hash manuelt
        if (!session && hash.includes("access_token=")) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken) {
            const { data, error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (setError) {
              console.error("[AuthHashHandler] setSession error:", setError);
            } else {
              session = data.session;
            }
          }
        }

        if (sessionError) {
          console.error("[AuthHashHandler] Session error:", sessionError);
          if (sessionError.message?.includes("Invalid Refresh Token")) {
            await supabase.auth.signOut();
            router.replace(`/${locale}/login?error=session_expired`);
            return;
          }
          setError("Kunne ikke etablere session. Prøv igjen.");
          setIsProcessing(false);
          return;
        }

        if (session) {
          window.history.replaceState(null, "", window.location.pathname);
          router.push(localizedPathname(locale, "/dashboard"));
          router.refresh();
        } else {
          console.warn("[AuthHashHandler] No session found after all attempts");
          setError("Ingen session funnet. Prøv å logge inn på nytt.");
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("[AuthHashHandler] Exception:", err);
        setError("En uventet feil oppstod. Prøv igjen.");
        setIsProcessing(false);
      }
    };

    handleAuthHash();
  }, [mounted, pathname, router, locale]);

  // Consistent SSR + hydration: return null until mounted.
  // This guarantees identical output during SSR and initial client render,
  // preventing hydration mismatch from usePathname() returning null on client.
  if (!mounted) return null;

  // After mount, skip entirely on callback page — the server-side /callback route handler handles PKCE exclusively
  if (pathname?.includes("/callback")) return null;

  // Vis error-state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 max-w-md w-full text-center">
          <h1 suppressHydrationWarning className="text-xl font-bold text-red-400 mb-4">Innlogging feilet</h1>
          <p suppressHydrationWarning className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              router.push(localizedPathname(locale, "/login"));
            }}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Tilbake til login
          </button>
        </div>
      </div>
    );
  }

  // Vis loading-state mens vi prosesserer
  if (isProcessing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 suppressHydrationWarning className="text-xl font-bold text-white mb-2">Fullfører innlogging...</h1>
          <p suppressHydrationWarning className="text-slate-400">Vennligst vent mens vi verifiserer din konto.</p>
        </div>
      </div>
    );
  }

  return null;
}
