"use client";

/**
 * RESET PASSWORD PAGE
 *
 * Bruker oppgir e-post for å motta tilbakestillingslenke.
 */

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { sendPasswordReset } from "@/lib/auth/new/auth-actions";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

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
      <AuthShell mode="reset">
        <AuthCard
          mode="reset"
          header={{
            icon: <CheckCircle className="h-6 w-6 text-green-500" />,
            title: t("pages.resetPassword.checkEmailTitle"),
            description: t("pages.resetPassword.checkEmailDesc"),
          }}
        >
          <div className="text-center">
            <Link
              href={`/${locale}/login`}
              className="text-blue-400 hover:text-blue-300"
            >
              {t("pages.resetPassword.backToLogin")}
            </Link>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="reset">
      <AuthCard
        mode="reset"
        header={{
          title: t("pages.resetPassword.title"),
          description: t("pages.resetPassword.desc"),
        }}
      >
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <AuthFormField
              id="email"
              name="email"
              type="email"
              label={t("emailLabel")}
              placeholder={t("emailPlaceholder")}
              required
              variant="public"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-600/50"
            >
              {loading
                ? t("pages.resetPassword.sending")
                : t("pages.resetPassword.submit")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={`/${locale}/login`}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {t("pages.resetPassword.backToLogin")}
            </Link>
          </div>
        </AuthCard>
    </AuthShell>
  );
}
