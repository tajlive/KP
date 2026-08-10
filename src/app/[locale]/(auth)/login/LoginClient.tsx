"use client";

/**
 * LOGIN PAGE - Client-side auth
 *
 * Bruker Supabase client-side auth direkte for å unngå
 * UnrecognizedActionError som oppstår med Server Actions
 * under deploy-overganger.
 */

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/utils";
import {
  CONFIG_ERROR_MSG,
  CONFIG_USER_MSG_NO,
} from "@/lib/supabase/client";
import {
  signInWithGoogle,
  signInWithMicrosoft,
  signInWithApple,
} from "@/lib/auth/googleAuth";
import { isMicrosoftOAuthEnabled, isAppleOAuthEnabled } from "@/lib/auth/config";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Successful login — redirect to intended page or dashboard
      const next = searchParams?.get("next");
      router.push(next || `/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message === CONFIG_ERROR_MSG
          ? CONFIG_USER_MSG_NO
          : err instanceof Error
            ? err.message
            : "Innlogging feilet",
      );
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
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

  async function handleMicrosoftLogin() {
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

  async function handleAppleLogin() {
    setLoading(true);
    setError("");
    try {
      await signInWithApple();
      // Redirect happens inside signInWithApple — no need to handle success
    } catch (err) {
      setError(
        err instanceof Error && err.message === CONFIG_ERROR_MSG
          ? CONFIG_USER_MSG_NO
          : err instanceof Error
            ? err.message
            : "Apple-innlogging feilet",
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login" locale={locale} data-testid="login-page">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Klarpakke</h1>
          <p className="mt-2 text-slate-400">{t("pages.login.subtitle")}</p>
        </div>

        {/* Login Card */}
        <AuthCard mode="login">
          {error && (
            <div
              data-testid="auth-error"
              className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          {/* Email Login Form — method="post" hindrer at passord havner i URL
              dersom React-hydration er treg/feitlar (native GET-submit som fallback) */}
          <form onSubmit={handleSubmit} method="post" className="space-y-4">
            <AuthFormField
              id="email"
              name="email"
              type="email"
              label={t("emailLabel")}
              placeholder={t("emailPlaceholder")}
              required
              autoComplete="email"
              variant="public"
            />

            <AuthFormField
              id="password"
              name="password"
              type="password"
              label={t("passwordLabel")}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              variant="public"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-600/50"
            >
              {loading ? t("loggingIn") : t("loginBtn")}
            </button>
          </form>

          {/* Divider */}
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

          {/* OAuth Providers */}
          <div className="space-y-3">
            {/* Google Login */}
            <button
              data-testid="google-login-button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-100 disabled:bg-gray-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("pages.login.continueWithGoogle")}
            </button>

            {isAppleOAuthEnabled && (
              <button
                data-testid="apple-login-button"
                onClick={handleAppleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-semibold text-white transition-colors hover:bg-gray-800 disabled:bg-black/50"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.87 3.24-.78 1.28.1 2.25.61 2.88 1.56-2.65 1.59-2.22 5.06.44 6.11-.52 1.54-1.19 3.07-2.64 5.28ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
                </svg>
                {t("pages.login.continueWithApple")}
              </button>
            )}

            {isMicrosoftOAuthEnabled && (
              <button
                data-testid="microsoft-login-button"
                onClick={handleMicrosoftLogin}
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

        {/* Links */}
        <div className="space-y-2 text-center">
          <Link
            href={`/${locale}/reset-password`}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {t("forgotPassword")}
          </Link>
          <p className="text-sm text-slate-400">
            {t("noAccount")}{" "}
            <Link
              href={`/${locale}/register`}
              className="text-blue-400 hover:text-blue-300"
            >
              {t("pages.login.registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
