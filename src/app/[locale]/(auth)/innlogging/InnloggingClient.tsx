"use client";

import { AuthButtons } from "@/components/auth/UnifiedAuthButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

/**
 * Saniterer redirect-destinasjon til en sikker relativ sti.
 */
function sanitizeClientRedirect(value: string | null, locale: string): string {
  const fallback = `/${locale}/dashboard`;
  if (!value) return fallback;

  try {
    const url = new URL(value);
    const path = url.pathname + (url.search || "");
    if (!path || path.includes("/innlogging")) return fallback;
    return path;
  } catch {
    if (!value.startsWith("/") || value.startsWith("//")) return fallback;
    if (value.includes("/innlogging")) return fallback;
    return value;
  }
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function InnloggingForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "logging_in" | "login_error">(
    "idle",
  );
  const [loginError, setLoginError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const locale = useLocale();

  // Lagre referral-kode i cookie
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref && typeof window !== "undefined") {
      document.cookie = `kp_ref=${encodeURIComponent(ref)};path=/;max-age=3600;SameSite=Lax`;
    }
  }, [searchParams]);

  const errorParam = searchParams?.get("error");

  useEffect(() => {
    if (errorParam) {
      const errorMessage = getAuthErrorMessage(errorParam);
      setLoginError(errorMessage || t("loginError"));
      setStatus("login_error");
    }
  }, [errorParam, t]);

  const next = searchParams?.get("next") as string | null;
  const rawRedirect = next || searchParams?.get("redirectTo") || null;
  const safeRedirectTo = sanitizeClientRedirect(rawRedirect, locale);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

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
        setStatus("login_error");
        setLoginError(getErrorMessage(error, locale));
        return;
      }

      if (user) {
        router.push(safeRedirectTo, { scroll: false });
      }
    } catch {
      setStatus("login_error");
      setLoginError(t("genericError"));
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6" data-testid="login-page">
      <div className="max-w-md mx-auto">
        <div className="flex justify-center mb-8">
          <Link href={`/${locale}`}>
            <Image
              src="/logo.svg"
              alt="Klarpakke"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              {t("signIn")}
            </CardTitle>
            <CardDescription className="text-center text-gray-500">
              {t("signInDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {!showEmailForm && (
              <>
                <AuthButtons
                  locale={locale}
                  providers={["GOOGLE", "MICROSOFT", "LINKEDIN"]}
                  showMagicLink={true}
                  redirectPath={rawRedirect ? safeRedirectTo : undefined}
                />

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-gray-500">
                      {locale === "no" ? "eller" : "or"}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowEmailForm(true)}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {locale === "no"
                    ? "Logg inn med e-post"
                    : "Sign in with email"}
                </Button>
              </>
            )}

            {showEmailForm && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  type="submit"
                  disabled={status === "logging_in"}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
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

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEmailForm(false)}
                  className="w-full text-sm text-gray-500"
                >
                  ← {locale === "no" ? "Tilbake" : "Back"}
                </Button>
              </form>
            )}

            <div className="flex flex-col gap-2 text-center text-sm">
              <Link
                href={`/${locale}/glemt-passord`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
              <span className="text-gray-500">
                {t("noAccount")}{" "}
                <Link
                  href={`/${locale}/signup`}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {t("createAccount")}
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-gray-500">
          Ved å logge inn godtar du våre{" "}
          <Link
            href={`/${locale}/vilkar`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            vilkår
          </Link>{" "}
          og{" "}
          <Link
            href={`/${locale}/personvern`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            personvernerklæring
          </Link>
        </p>
      </div>
    </div>
  );
}

// Loading fallback - matches InnloggingForm styling
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6" data-testid="login-page">
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
