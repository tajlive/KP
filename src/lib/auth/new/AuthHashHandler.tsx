"use client";

/**
 * AUTH HASH HANDLER
 * 
 * Håndterer tilfeller hvor Supabase redirecter til rot-URL
 * med access_token i hash (i stedet for å gå via /callback).
 * 
 * Dette skjer når Site URL i Supabase er satt til hovedsiden
 * i stedet for callback-ruten.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localizedPathname } from "@/middleware/locale-path";

export function AuthHashHandler() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sjekk for error i URL (f.eks. access_denied fra OAuth)
    const urlError = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    if (urlError) {
      console.error("[AuthHashHandler] OAuth error:", urlError, errorDescription);
      setError(errorDescription || "Autentisering ble avbrutt");
      setIsProcessing(false);
      return;
    }

    // Sjekk om det er auth-data i URL-hashen
    const hash = window.location.hash;
    console.log("[AuthHashHandler] Checking hash:", hash ? "Found hash" : "No hash");
    
    if (!hash || !hash.includes("access_token=")) {
      console.log("[AuthHashHandler] No access_token in hash, skipping");
      return;
    }

    console.log("[AuthHashHandler] Found access_token in hash, processing...");

    const handleAuthHash = async () => {
      setIsProcessing(true);
      setError(null);
      const supabase = createClient();

      try {
        // Vent litt for å la Supabase klienten prosessere hash
        // (detectSessionInUrl: true skal gjøre dette automatisk)
        console.log("[AuthHashHandler] Waiting for Supabase to process hash...");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Sjekk om session allerede er satt av detectSessionInUrl
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        let session = initialSession;

        console.log("[AuthHashHandler] Initial session check:", session ? "Found" : "Not found", sessionError ? "Error: " + sessionError.message : "No error");

        // Hvis fortsatt ingen session, prøv å parse hash manuelt
        if (!session && hash.includes("access_token=")) {
          console.log("[AuthHashHandler] Trying manual hash parsing...");
          
          // Parse hash parameters
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const expiresIn = hashParams.get("expires_in");
          const tokenType = hashParams.get("token_type");
          
          console.log("[AuthHashHandler] Parsed tokens:", {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            expiresIn,
            tokenType
          });
          
          if (accessToken) {
            // Sett session manuelt
            console.log("[AuthHashHandler] Setting session manually...");
            const { data, error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            
            if (setError) {
              console.error("[AuthHashHandler] setSession error:", setError);
            } else {
              console.log("[AuthHashHandler] setSession success:", data.session ? "Has session" : "No session");
              session = data.session;
            }
          }
        }

        if (sessionError) {
          console.error("[AuthHashHandler] Session error:", sessionError);
          setError("Kunne ikke etablere session. Prøv igjen.");
          setIsProcessing(false);
          return;
        }

        if (session) {
          console.log("[AuthHashHandler] Session established, redirecting to dashboard...");
          // Fjern hash fra URL uten å trigge page reload
          window.history.replaceState(null, "", window.location.pathname);
          
          // Redirect til dashboard
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
  }, [router, searchParams]);

  // Vis error-state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-400 mb-4">Innlogging feilet</h1>
          <p className="text-slate-400 mb-6">{error}</p>
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
          <h1 className="text-xl font-bold text-white mb-2">Fullfører innlogging...</h1>
          <p className="text-slate-400">Vennligst vent mens vi verifiserer din konto.</p>
        </div>
      </div>
    );
  }

  return null;
}
