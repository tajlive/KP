"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { BRAND, RADIUS, SHADOW } from "@/lib/design/tokens";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logAuthError, logAuthEvent, AuthErrorCode, AuthEvent } from "@/lib/auth/sentry-auth";

// Inner component that uses useSearchParams - must be wrapped in Suspense
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("auth");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "validating" | "updating" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isValidLink, setIsValidLink] = useState(true);

  const passwordFieldId = "reset-password-input";
  const confirmPasswordFieldId = "reset-confirm-password-input";

  // Defensive mount to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  // Validate that we have a code in the URL (from Supabase)
  useEffect(() => {
    const code = searchParams?.get("code");
    const type = searchParams?.get("type");

    // Supabase sends recovery emails with ?code=xxx&type=recovery
    if (!code) {
      setIsValidLink(false);
      setErrorMessage(
        locale === "no"
          ? "Ugyldig eller utløpt lenke. Vennligst be om en ny passordtilbakestilling."
          : "Invalid or expired link. Please request a new password reset."
      );
      logAuthError(AuthErrorCode.INVALID_RESET_TOKEN, new Error("No code in URL"), {
        locale,
        hasType: !!type,
      });
    }
  }, [searchParams, locale]);

  const validatePassword = (): boolean => {
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage(
        locale === "no"
          ? "Passordet må være minst 8 tegn"
          : "Password must be at least 8 characters"
      );
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        locale === "no" ? "Passordene stemmer ikke overens" : "Passwords do not match"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setStatus("updating");
    logAuthEvent(AuthEvent.PASSWORD_RESET_STARTED, { locale });

    try {
      const supabase = getSupabaseClient();

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("[ResetPassword] Update failed:", error.message);
        logAuthError(AuthErrorCode.PASSWORD_RESET_FAILED, error, {
          locale,
          errorCode: error.code,
          errorStatus: error.status,
        });

        setStatus("error");
        setErrorMessage(
          locale === "no"
            ? "Kunne ikke oppdatere passord. Vennligst prøv igjen."
            : "Could not update password. Please try again."
        );
        return;
      }

      // Success!
      logAuthEvent(AuthEvent.PASSWORD_RESET_SUCCESS, { locale });
      setStatus("success");

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push(`/${locale}/logg-inn?reset=success`);
      }, 2000);
    } catch (unexpectedError) {
      console.error("[ResetPassword] Unexpected error:", unexpectedError);
      logAuthError(AuthErrorCode.UNKNOWN, unexpectedError, { locale });

      setStatus("error");
      setErrorMessage(
        locale === "no"
          ? "En uventet feil oppstod. Vennligst prøv igjen."
          : "An unexpected error occurred. Please try again."
      );
    }
  };

  // Success state
  if (status === "success") {
    return (
      <div
        className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6"
        data-testid="reset-password-success"
      >
        <div className="max-w-md mx-auto">
          <Card
            className={`bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 ${SHADOW.card}`}
          >
            <CardContent className="pt-6 pb-6 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {locale === "no" ? "Passord oppdatert!" : "Password updated!"}
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-slate-400">
                {locale === "no"
                  ? "Du kan nå logge inn med ditt nye passord."
                  : "You can now log in with your new password."}
              </CardDescription>
              <div className="mt-6">
                <Link
                  href={`/${locale}/logg-inn`}
                  className={`${BRAND.link} underline underline-offset-2`}
                >
                  {locale === "no" ? "Gå til innlogging" : "Go to login"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Invalid link state
  if (!isValidLink) {
    return (
      <div
        className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6"
        data-testid="reset-password-invalid"
      >
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-8">
            <Link href={`/${locale}`} aria-label="Klarpakke">
              <Image
                src="/logo.svg"
                alt=""
                role="presentation"
                width={180}
                height={40}
                className="h-10 w-auto dark:invert"
                priority
              />
            </Link>
          </div>

          <Card
            className={`bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 ${SHADOW.card}`}
          >
            <CardContent className="pt-6 pb-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {locale === "no" ? "Ugyldig lenke" : "Invalid link"}
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-slate-400 mb-6">
                {errorMessage}
              </CardDescription>
              <Link href={`/${locale}/glemt-passord`}>
                <Button className={`w-full ${BRAND.primary}`}>
                  {locale === "no"
                    ? "Be om ny tilbakestilling"
                    : "Request new reset"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6"
      data-testid="reset-password-page"
    >
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <Link
            href={`/${locale}`}
            aria-label={locale === "no" ? "Klarpakke" : "Klarpakke"}
          >
            <Image
              src="/logo.svg"
              alt=""
              role="presentation"
              width={180}
              height={40}
              className="h-10 w-auto dark:invert"
              priority
            />
          </Link>
        </div>

        <Card
          className={`bg-white dark:bg-slate-900 ${RADIUS.card} border border-slate-200 dark:border-slate-800 ${SHADOW.card}`}
        >
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-slate-100">
              {locale === "no" ? "Velg nytt passord" : "Choose new password"}
            </CardTitle>
            <CardDescription className="text-center text-gray-500 dark:text-slate-400">
              {locale === "no"
                ? "Skriv inn ditt nye passord nedenfor."
                : "Enter your new password below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {errorMessage && (
              <div
                data-testid="reset-password-error"
                className="flex items-center gap-2 p-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor={passwordFieldId} className="sr-only">
                  {locale === "no" ? "Nytt passord" : "New password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                  <Input
                    id={passwordFieldId}
                    data-testid="reset-password-input"
                    type={isClient && showPassword ? "text" : "password"}
                    placeholder={
                      locale === "no" ? "Nytt passord (minst 8 tegn)" : "New password (min 8 chars)"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 h-12 ${RADIUS.input} border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-shadow duration-200`}
                    required
                    minLength={8}
                    disabled={status === "updating"}
                    aria-invalid={!!errorMessage}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                    aria-label={
                      showPassword
                        ? locale === "no"
                          ? "Skjul passord"
                          : "Hide password"
                        : locale === "no"
                          ? "Vis passord"
                          : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor={confirmPasswordFieldId} className="sr-only">
                  {locale === "no" ? "Bekreft passord" : "Confirm password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                  <Input
                    id={confirmPasswordFieldId}
                    data-testid="reset-confirm-password-input"
                    type={isClient && showConfirmPassword ? "text" : "password"}
                    placeholder={
                      locale === "no" ? "Bekreft nytt passord" : "Confirm new password"
                    }
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 h-12 ${RADIUS.input} border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-shadow duration-200`}
                    required
                    minLength={8}
                    disabled={status === "updating"}
                    aria-invalid={!!errorMessage}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                    aria-label={
                      showConfirmPassword
                        ? locale === "no"
                          ? "Skjul bekreftelse"
                          : "Hide confirmation"
                        : locale === "no"
                          ? "Vis bekreftelse"
                          : "Show confirmation"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="reset-password-submit"
                disabled={status === "updating"}
                className={`w-full h-12 ${RADIUS.button} ${BRAND.primary} font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]`}
              >
                {status === "updating" ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {locale === "no" ? "Oppdaterer..." : "Updating..."}
                  </>
                ) : (
                  <>
                    {locale === "no" ? "Oppdater passord" : "Update password"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-gray-500 dark:text-slate-400">
                {locale === "no" ? "Husket passordet?" : "Remembered your password?"}{" "}
                <Link
                  href={`/${locale}/logg-inn`}
                  className={`${BRAND.link} underline underline-offset-2 font-medium`}
                >
                  {locale === "no" ? "Logg inn" : "Sign in"}
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6"
      data-testid="reset-password-loading"
    >
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="border border-gray-200 shadow-sm rounded-lg p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="space-y-3 pt-4">
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export - wraps the form in Suspense
export function ResetPasswordClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
