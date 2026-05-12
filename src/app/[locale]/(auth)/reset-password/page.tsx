"use client";

/**
 * RESET PASSWORD PAGE
 * 
 * Bruker oppgir e-post for å motta tilbakestillingslenke.
 */

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { sendPasswordReset } from "@/lib/auth/new/auth-actions";

export const runtime = 'edge';

export default function ResetPasswordPage() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    
    const result = await sendPasswordReset(formData);
    
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
            <h1 className="text-2xl font-bold text-white mb-4">{t("pages.resetPassword.checkEmailTitle")}</h1>
            <p className="text-slate-400 mb-6">
              {t("pages.resetPassword.checkEmailDesc")}
            </p>
            <Link
              href={`/${locale}/login`}
              className="text-blue-400 hover:text-blue-300"
            >
              {t("pages.resetPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">{t("pages.resetPassword.title")}</h1>
          <p className="mt-2 text-slate-400">
            {t("pages.resetPassword.desc")}
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                {t("emailLabel")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("emailPlaceholder")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? t("pages.resetPassword.sending") : t("pages.resetPassword.submit")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href={`/${locale}/login`} className="text-sm text-blue-400 hover:text-blue-300">
              {t("pages.resetPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
