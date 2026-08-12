"use client";

/**
 * REGISTER PAGE
 *
 * Brukerregistrering med e-post/passord.
 */

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { signUpWithEmail } from "@/lib/auth/new/auth-actions";
import { signInWithGoogle, signInWithMicrosoft } from "@/lib/auth/googleAuth";
import { isMicrosoftOAuthEnabled } from "@/lib/auth/config";
import { CONFIG_ERROR_MSG, CONFIG_USER_MSG_NO } from "@/lib/supabase/client";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

export default function RegisterPage() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");

    const result = await signUpWithEmail(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.hasSession) {
      // KLA-263: Nye brukere må fullføre onboarding før dashboard
      // Omdiriger til onboarding, ikke dashboard (Finelo-mønsteret + guard)
      window.location.href = `/${locale}/onboarding`;
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      // Redirect happens inside signInWithGoogle — no need to handle success
    } catch (err) {
      setError(
        err instanceof Error && err.message === CONFIG_ERROR_MSG
          ? CONFIG_USER_MSG_NO
          : err instanceof Error
            ? err.message
            : "Google-innlogging feilet",
      );
      setLoading(false);
    }
  }

  async function handleMicrosoftSignup() {
    setLoading(true);
    setError("");
    try {
      await signInWithMicrosoft();
      // Redirect happens inside signInWithMicrosoft — no need to handle success
    } catch (err) {
      setError(
        err instanceof Error && err.message === CONFIG_ERROR_MSG
          ? CONFIG_USER_MSG_NO
          : err instanceof Error
            ? err.message
            : "Microsoft-innlogging feilet",
      );
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell mode="register">
        <AuthCard
          mode="register"
          header={{
            icon: <CheckCircle className="h-6 w-6 text-green-500" />,
            title: t("pages.register.userCreated"),
            description: t("pages.register.confirmationSent"),
          }}
        >
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-400">
              {t("pages.register.paperCreditsAwait")}
            </p>
            <Link
              href={`/${locale}/login`}
              className="text-blue-400 hover:text-blue-300"
            >
              {t("pages.register.goToLogin")}
            </Link>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="register">
      <AuthCard
        mode="register"
        header={{
          title: t("pages.register.title"),
          description: t("pages.register.subtitle"),
        }}
      >
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <AuthFormField
            id="username"
            name="username"
            type="text"
            label="Brukernavn"
            placeholder="DittBrukernavn"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9]+"
            variant="public"
          />

          <AuthFormField
            id="email"
            name="email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            required
            variant="public"
          />

          <AuthFormField
            id="password"
            name="password"
            type="password"
            label={t("passwordLabel")}
            placeholder={t("pages.register.passwordPlaceholder")}
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
              ? t("pages.register.creatingAccount")
              : t("pages.register.createAccount")}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-slate-900 px-2 text-slate-500">
              {t("pages.login.or")}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:bg-gray-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("pages.login.continueWithGoogle")}
          </button>

          {isMicrosoftOAuthEnabled && (
            <button
              onClick={handleMicrosoftSignup}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2F2F2F] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#1F1F1F] disabled:bg-[#2F2F2F]/50"
            >
              <svg className="h-5 w-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {t("pages.login.continueWithMicrosoft")}
            </button>
          )}
        </div>
      </AuthCard>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400">
          {t("pages.register.haveAccount")}{" "}
          <Link
            href={`/${locale}/login`}
            className="text-blue-400 hover:text-blue-300"
          >
            {t("pages.register.logIn")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
