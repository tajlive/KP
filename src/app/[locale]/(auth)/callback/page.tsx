"use client";

/**
 * OAUTH CALLBACK PAGE
 * 
 * Håndterer callback fra Google/Microsoft OAuth.
 * Supabase exchangeCodeForSession skjer automatisk via @supabase/ssr
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Check for error in URL (user denied access)
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      
      if (errorParam) {
        setError(errorDescription || "Autentisering ble avbrutt");
        setLoading(false);
        return;
      }

      // Exchange code for session (PKCE flow)
      // Supabase client handles this automatically with cookies
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (session) {
        // Success! Redirect to dashboard
        router.push("/no/dashboard");
        router.refresh();
      } else {
        // No session, might need to wait or error
        setError("Kunne ikke fullføre innlogging. Prøv igjen.");
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div data-testid="auth-error" className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-400 mb-4">Innlogging feilet</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            data-testid="retry-login-button"
            onClick={() => router.push("/no/login")}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Tilbake til login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="auth-callback-loading" className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-white mb-2">Fullfører innlogging...</h1>
        <p className="text-slate-400">Vennligst vent mens vi verifiserer din konto.</p>
      </div>
    </div>
  );
}
