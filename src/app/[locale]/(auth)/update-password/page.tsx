"use client";

/**
 * UPDATE PASSWORD PAGE
 *
 * Bruker setter nytt passord etter å ha mottatt reset-link på e-post.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
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
      <AuthShell mode="update">
        <AuthCard
          mode="update"
          header={{
            icon: <CheckCircle className="h-6 w-6 text-green-500" />,
            title: t("pages.updatePassword.successTitle"),
            description: t("pages.updatePassword.successDesc"),
          }}
        >
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t("pages.updatePassword.goToLogin")}
          </button>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="update">
      <AuthCard
        mode="update"
        header={{
          title: t("pages.updatePassword.title"),
          description: t("pages.updatePassword.desc"),
        }}
      >
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
    </AuthShell>
  );
}
