"use client";

/**
 * LOGIN PAGE - Forenklet
 * 
 * - Epost + passord skjema (server action)
 * - Google OAuth knapp
 * - Link til register og glemt passord
 */

import { useState } from "react";
import Link from "next/link";
import { signInWithEmail, signInWithGoogle, signInWithMicrosoft } from "@/lib/auth/new/auth-actions";

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    
    const result = await signInWithEmail(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Hvis success, redirect skjer automatisk fra server action
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const result = await signInWithGoogle();
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    setLoading(true);
    const result = await signInWithMicrosoft();
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Klarpakke</h1>
          <p className="mt-2 text-slate-400">Logg inn på din konto</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Email Login Form */}
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
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Logger inn..." : "Logg inn"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-500">eller</span>
            </div>
          </div>

          {/* OAuth Providers */}
          <div className="space-y-3">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-gray-100 disabled:bg-gray-100 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Fortsett med Google
            </button>

            {/* Microsoft Login */}
            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#2F2F2F] hover:bg-[#1F1F1F] disabled:bg-[#2F2F2F]/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Fortsett med Microsoft
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="text-center space-y-2">
          <Link
            href="/no/reset-password"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Glemt passord?
          </Link>
          <p className="text-sm text-slate-400">
            Har du ikke konto?{" "}
            <Link href="/no/register" className="text-blue-400 hover:text-blue-300">
              Registrer deg
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
