"use client";

/**
 * UPDATE PASSWORD PAGE
 *
 * Bruker setter nytt passord etter å ha mottatt reset-link på e-post.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { updatePassword } from "@/lib/auth/new/auth-actions";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");
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
      <AuthShell mode="update" locale={locale}>
        <div className="w-full max-w-md space-y-8 text-center">
          <AuthCard mode="update">
            <div className="mb-4 text-5xl text-green-400">✓</div>
            <h1 className="mb-4 text-2xl font-bold text-white">
              {t("pages.updatePassword.successTitle")}
            </h1>
            <p className="mb-6 text-slate-400">
              {t("pages.updatePassword.successDesc")}
            </p>
            <button
              onClick={() => router.push(`/${locale}/login`)}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("pages.updatePassword.goToLogin")}
            </button>
          </AuthCard>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="update" locale={locale}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">
            {t("pages.updatePassword.title")}
          </h1>
          <p className="mt-2 text-slate-400">
            {t("pages.updatePassword.desc")}
          </p>
        </div>

        <AuthCard mode="update">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <AuthFormField
              id="password"
              name="password"
              type="password"
              label={t("resetPassword.label")}
              placeholder={t("pages.updatePassword.placeholder")}
              required
              minLength={8}
              variant="public"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-600/50"
            >
              {loading
                ? t("pages.updatePassword.updating")
                : t("pages.updatePassword.submit")}
            </button>
          </form>
        </AuthCard>
      </div>
    </AuthShell>
  );
}
