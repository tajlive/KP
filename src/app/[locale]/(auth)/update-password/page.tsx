"use client";

/**
 * UPDATE PASSWORD PAGE
 * 
 * Bruker setter nytt passord etter å ha mottatt reset-link på e-post.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/auth/new/auth-actions";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    
    const result = await updatePassword(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-white mb-4">Passord oppdatert!</h1>
            <p className="text-slate-400 mb-6">Ditt passord har blitt endret. Du kan nå logge inn med det nye passordet.</p>
            <button
              onClick={() => router.push("/no/login")}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Gå til login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Nytt passord</h1>
          <p className="mt-2 text-slate-400">Velg et nytt passord for kontoen din</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Oppdaterer..." : "Oppdater passord"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
