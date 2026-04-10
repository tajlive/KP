"use client";

/**
 * REGISTER PAGE - Forenklet
 * 
 * - Registreringsskjema
 * - Validering av passord
 * - Success melding
 */

import { useState } from "react";
import Link from "next/link";
import { signUpWithEmail } from "@/lib/auth/new/auth-actions";

export default function RegisterPage() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    // Client-side validering
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

    const result = await signUpWithEmail(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.message);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Klarpakke</h1>
          <p className="mt-2 text-slate-400">Opprett ny konto</p>
        </div>

        {/* Register Card */}
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                E-post
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="din@epost.no"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Passord
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
              disabled={loading || !!success}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Oppretter konto..." : "Opprett konto"}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="text-center">
          <p className="text-sm text-slate-400">
            Har du allerede konto?{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Logg inn
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
