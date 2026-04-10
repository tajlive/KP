"use client";

/**
 * UPDATE PASSWORD PAGE - Forenklet
 * 
 * - Sette nytt passord etter å ha klikket e-post lenke
 * - Verifisere code fra URL først
 */

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/auth/new/auth-actions";

function UpdatePasswordForm() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const searchParams = useSearchParams();

  // Verifiser code fra URL når siden loader
  useEffect(() => {
    const code = searchParams.get("code");
    
    if (!code) {
      setError("Ugyldig eller utløpt lenke");
      setValidating(false);
      return;
    }

    // Verifiser code for å etablere session
    const supabase = createClient();
    supabase.auth.verifyOtp({
      token_hash: code,
      type: "recovery",
    }).then(({ error }) => {
      if (error) {
        setError("Lenken er ugyldig eller har utløpt");
      }
      setValidating(false);
    });
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passordene stemmer ikke overens");
      setLoading(false);
      return;
    }

    const result = await updatePassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Hvis success, redirect skjer automatisk
  }

  if (validating) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-slate-400">Verifiserer lenke...</p>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 mb-4">{error}</div>
        <Link href="/auth/reset-password" className="text-blue-400 hover:text-blue-300">
          Be om ny lenke
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          Nytt passord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Minst 8 tegn"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
          Bekreft passord
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Gjenta passord"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? "Oppdaterer..." : "Oppdater passord"}
      </button>
    </form>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Klarpakke</h1>
          <p className="mt-2 text-slate-400">Velg nytt passord</p>
        </div>

        {/* Update Password Card */}
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <Suspense fallback={
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          }>
            <UpdatePasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
