"use client";

import { AuthButtons } from "@/features/auth/UnifiedAuthButton";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/config";
import {
  getErrorMessage,
  isValidEmail,
  signInWithEmail,
} from "@/lib/auth/utils";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { BRAND, RADIUS, SHADOW } from "@/lib/design/tokens";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, Suspense } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { logAuthError, logAuthEvent, AuthErrorCode, AuthEvent, setAuthUser } from "@/lib/auth/sentry-auth";

/**
 * Saniterer redirect-destinasjon til en sikker relativ sti.
 */
function sanitizeClientRedirect(value: string | null, locale: string): string {
  /** Kanonisk: norsk uten /no-prefix (as-needed), engelsk /en/dashboard */
  const fallback = hrefWithLocale(locale, "/dashboard");
  if (!value) return fallback;

  try {
    const url = new URL(value);
    const path = url.pathname + (url.search || "");
    if (!path || path.includes("/login")) return fallback;
    // Normalize typo: dashbord → dashboard
    const normalized = path.replace(/\/dashbord(\/|$)/g, "/dashboard$1");
    return normalized;
  } catch {
    if (!value.startsWith("/") || value.startsWith("//")) return fallback;
    if (value.includes("/login")) return fallback;
    const normalized = value.replace(/\/dashbord(\/|$)/g, "/dashboard$1");
    return normalized;
  }
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function InnloggingForm() {
  const emailFieldId = useId();
  const passwordFieldId = useId();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "logging_in" | "login_error">(
    "idle",
  );
  const [loginError, setLoginError] = useState("");
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const locale = useLocale();

  // CRITICAL FIX: Defensive mount to prevent hydration mismatch
  // and ensure password is ALWAYS hidden on initial render
  useEffect(() => {
    setIsClient(true);
    // Force reset to hidden on every mount - defensive against any 
    // state leakage from hot reload, strict mode, or browser autofill
    setShowPassword(false);
    
    if (process.env.NODE_ENV === 'development') {
       
      console.log('[InnloggingForm] Mounted - password visibility reset to hidden');
    }
  }, []);

  // Lagre referral-kode i cookie
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref && typeof window !== "undefined") {
      document.cookie = `kp_ref=${encodeURIComponent(ref)};path=/;max-age=3600;SameSite=Lax`;
    }
  }, [searchParams]);

  const errorParam = searchParams?.get("error");
  const detailParam = searchParams?.get("detail");

  useEffect(() => {
    if (errorParam) {
      let errorMessage = getAuthErrorMessage(errorParam);
      if (detailParam && typeof detailParam === "string") {
        try {
          const decoded = decodeURIComponent(detailParam);
          if (decoded && decoded.length < 200) errorMessage += ` (${decoded})`;
        } catch {
          /* ignore */
        }
      }
      setLoginError(errorMessage || t("loginError"));
      setStatus("login_error");
    }
  }, [errorParam, detailParam, t]);

  const next = searchParams?.get("next") as string | null;
  const rawRedirect = next || searchParams?.get("redirectTo") || null;
  const safeRedirectTo = sanitizeClientRedirect(rawRedirect, locale);

  // Innlogget bruker som besøker innlogging → dashboard (backup for middleware)
  useEffect(() => {
    if (!loading && user) router.replace(safeRedirectTo);
  }, [loading, user, router, safeRedirectTo]);

  /** Egen innsending (type="button") — unngår nativ POST til /innlogging som hopper over Supabase (Playwright så POST 200 uten /auth/v1/token). */
  const submitEmailLogin = async () => {
    logAuthEvent(AuthEvent.LOGIN_STARTED, { 
      provider: 'email', 
      locale,
      method: 'password',
    });
    
    if (!isValidEmail(email)) {
      setLoginError(t("invalidEmail"));
      setStatus("login_error");
      return;
    }

    if (!password) {
      setLoginError(t("passwordRequired"));
      setStatus("login_error");
      return;
    }

    setStatus("logging_in");
    setLoginError("");

    try {
      const { user, error } = await signInWithEmail({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        logAuthError(AuthErrorCode.EMAIL_LOGIN_FAILED, error, { 
          locale,
          emailDomain: email.split('@')[1],
        });
        setStatus("login_error");
        setLoginError(getErrorMessage(error, locale));
        return;
      }

      if (user) {
        logAuthEvent(AuthEvent.LOGIN_SUCCESS, { 
          provider: 'email', 
          userId: (user as { id: string }).id,
          locale,
        });
        setAuthUser((user as { id: string }).id, email);
        router.push(safeRedirectTo, { scroll: false });
      }
    } catch (catchError) {
      logAuthError(AuthErrorCode.EMAIL_LOGIN_FAILED, catchError, { locale });
      setStatus("login_error");
      setLoginError(t("genericError"));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitEmailLogin();
  };

  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6"
      data-testid="login-page"
    >
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <Link
            href={`/${locale}`}
            aria-label={locale === "no" ? "Klarpakke – gå til forsiden" : "Klarpakke – go to homepage"}
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
              {t("signIn")}
            </CardTitle>
            <CardDescription className="text-center text-gray-500 dark:text-slate-400">
              {t("signInDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {/* Hydration-safe: only show error after client mount */}
            {isClient && loginError && (
              <div
                data-testid="innlogging-error"
                className="flex items-center gap-2 p-4 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <section
              aria-label={
                locale === "no" ? "Logg inn med e-post" : "Sign in with email"
              }
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {t("emailLabel")}
              </p>
              <form
                data-testid="innlogging-password-form"
                method="post"
                action="#"
                onSubmit={handleFormSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor={emailFieldId} className="sr-only">
                    {t("emailPlaceholder")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                    <Input
                      id={emailFieldId}
                      data-testid="innlogging-email-input"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 h-12 ${RADIUS.input} border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-shadow duration-200`}
                      required
                      disabled={status === "logging_in"}
                      aria-invalid={status === "login_error"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor={passwordFieldId} className="sr-only">
                    {t("passwordPlaceholder")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                    <Input
                      id={passwordFieldId}
                      data-testid="innlogging-password-input"
                      // CRITICAL: Always default to password type until client mount
                      // This prevents any SSR/hydration/autofill from showing plaintext
                      type={isClient && showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 h-12 ${RADIUS.input} border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-shadow duration-200`}
                      required
                      disabled={status === "logging_in"}
                      aria-invalid={status === "login_error"}
                    />
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        // EXPLICIT toggle only on user click - no derived state
                        setShowPassword(prev => {
                          const next = !prev;
                          if (process.env.NODE_ENV === 'development') {
                             
                            console.log(`[PasswordToggle] Changed to: ${next ? 'visible' : 'hidden'}`);
                          }
                          return next;
                        });
                      }}
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

                <Button
                  type="button"
                  data-testid="innlogging-submit"
                  disabled={status === "logging_in"}
                  onClick={() => {
                    void submitEmailLogin();
                  }}
                  className={`w-full h-12 ${RADIUS.button} ${BRAND.primary} font-semibold shadow-sm transition-all duration-200 active:scale-[0.98]`}
                >
                  {status === "logging_in" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("signingIn")}
                    </>
                  ) : (
                    <>
                      {t("signIn")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </section>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-slate-900 px-4 text-sm text-slate-500 dark:text-slate-400">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            <AuthButtons
              locale={locale}
              providers={["VIPPS", "GOOGLE", "MICROSOFT", "LINKEDIN"]}
              showMagicLink={true}
              redirectPath={rawRedirect ? safeRedirectTo : undefined}
              cardBg="bg-white dark:bg-slate-900"
            />

            <div className="flex flex-col gap-2 text-center text-sm">
              <Link
                href={`/${locale}/glemt-passord`}
                className={`${BRAND.link} underline underline-offset-2`}
              >
                {t("forgotPassword")}
              </Link>
              <span className="text-gray-500 dark:text-slate-400">
                {t("noAccount")}{" "}
                <Link
                  href={`/${locale}/signup`}
                  className={`${BRAND.link} underline underline-offset-2 font-medium`}
                >
                  {t("createAccount")}
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-slate-400">
          {t("termsPrefix")}{" "}
          <Link
            href={`/${locale}/vilkar`}
            className={`${BRAND.link} underline underline-offset-2`}
          >
            {t("terms")}
          </Link>{" "}
          {t("and")}{" "}
          <Link
            href={`/${locale}/personvern`}
            className={`${BRAND.link} underline underline-offset-2`}
          >
            {t("privacy")}
          </Link>
        </p>
      </div>
    </div>
  );
}

// Loading fallback - matches InnloggingForm styling
function LoadingFallback() {
  return (
    <div
      className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6"
      data-testid="login-page-loading"
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
export function InnloggingClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InnloggingForm />
    </Suspense>
  );
}
