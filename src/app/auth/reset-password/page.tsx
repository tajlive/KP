"use client";

/**
 * RESET PASSWORD PAGE - Forenklet
 * 
 * - Sende passordtilbakestilling e-post
 * - Success melding
 */

import { useState } from "react";
import Link from "next/link";
import { sendPasswordReset } from "@/lib/auth/new/auth-actions";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await sendPasswordReset(formData);

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
          <p className="mt-2 text-slate-400">Tilbakestill passord</p>
        </div>

        {/* Reset Card */}
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

          {!success && (
            <>
              <p className="text-slate-400 mb-4 text-sm">
                Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
              </p>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? "Sender..." : "Send tilbakestillingslenke"}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Links */}
        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-blue-400 hover:text-blue-300">
            Tilbake til innlogging
          </Link>
        </div>
      </div>
    </div>
  );
}
