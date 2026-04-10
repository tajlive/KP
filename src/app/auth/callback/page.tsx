"use client";

/**
 * OAUTH CALLBACK PAGE - Forenklet
 * 
 * - Håndtere code fra OAuth provider
 * - Exchange code for session
 * - Redirect til dashboard
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Håndtere OAuth feil
    if (errorParam) {
      setError(errorDescription || "Innlogging feilet");
      return;
    }

    // Må ha code
    if (!code) {
      setError("Ugyldig callback");
      return;
    }

    // Exchange code for session
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setError(error.message);
        } else {
          // Success! Redirect til dashboard
          router.push("/dashboard");
        }
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Innlogging feilet</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <a
            href="/auth/login"
            className="text-blue-400 hover:text-blue-300"
          >
            Prøv igjen
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-white">Logger inn...</h1>
        <p className="text-slate-400 mt-2">Vennligst vent</p>
      </div>
    </div>
  );
}
