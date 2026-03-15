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
import { getCallbackUrl } from "@/lib/auth/config";
import { isValidEmail } from "@/lib/auth/utils";
import { createClient } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/error";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SignupContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "signing_up" | "signup_error" | "success"
  >("idle");
  const [signupError, setSignupError] = useState("");
  const [mounted, setMounted] = useState(false);

  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo");
  const plan = searchParams?.get("plan");
  const locale = useLocale();
  const t = useTranslations("auth");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName.trim()) {
      setSignupError(
        locale === "no"
          ? "Vennligst skriv inn ditt fulle navn"
          : "Please enter your full name",
      );
      setStatus("signup_error");
      return;
    }

    if (!isValidEmail(email)) {
      setSignupError(
        locale === "no"
          ? "Vennligst skriv inn en gyldig e-postadresse"
          : "Please enter a valid email address",
      );
      setStatus("signup_error");
      return;
    }

    if (password.length < 8) {
      setSignupError(
        locale === "no"
          ? "Passordet må være minst 8 tegn"
          : "Password must be at least 8 characters",
      );
      setStatus("signup_error");
      return;
    }

    setStatus("signing_up");
    setSignupError("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            full_name: fullName,
            locale: locale,
          },
          emailRedirectTo: getCallbackUrl(locale),
        },
      });

      if (error) {
        setStatus("signup_error");
        setSignupError(getErrorMessage(error));
        return;
      }

      if (data.user) {
        // Grant 500 KLT welcome bonus for new users
        try {
          const { error: kltError } = await supabase
            .from("user_klt_balances")
            .upsert({
              user_id: data.user.id,
              balance: 500,
              total_earned: 500,
              updated_at: new Date().toISOString(),
            });
          
          if (!kltError) {
            // Record the transaction
            await supabase.from("klt_transactions").insert({
              user_id: data.user.id,
              amount: 500,
              type: "welcome_bonus",
              category: "signup",
              description: "Signup bonus",
              reason: "Registreringsbonus - Velkommen til Klarpakke!",
              created_at: new Date().toISOString(),
            });
          }
        } catch (kltErr) {
          console.error("[Signup] Failed to grant KLT bonus:", kltErr);
          // Don't block signup if KLT bonus fails
        }

        if (data.session) {
          setStatus("success");
          // Redirect logic
          if (redirectTo) {
            router.push(redirectTo);
          } else if (plan) {
            router.push(`/${locale}/checkout?plan=${plan}`);
          } else {
            router.push(`/${locale}/velkommen?bonus=klt`, { scroll: false });
          }
        } else {
          setStatus("success");
        }
      }
    } catch (error: unknown) {
      setStatus("signup_error");
      setSignupError(getErrorMessage(error));
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 animate-pulse">
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (status === "success") {
    return <VerifyEmailCard email={email} locale={locale} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <Link href={`/${locale}`} className="mb-8 block">
        <Image
          src="/logo.png"
          alt="Klarpakke"
          width={180}
          height={40}
          priority
        />
      </Link>

      <Card className="max-w-md w-full border-[#E2E5EC] bg-white shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 p-8 pb-4 text-center">
          <CardTitle className="text-3xl font-black text-[#1A1D26] tracking-tight">
            Opprett konto
          </CardTitle>
          <CardDescription className="text-[#5E6478] text-base">
            Start din reise mot smartere trading i dag.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <div className="mb-6">
            <AuthButtons redirectPath={redirectTo || `/${locale}/dashboard`} />
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#E2E5EC]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#5E6478] font-medium">
                  Eller med e-post
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="signup-fullname" className="text-sm font-bold text-[#1A1D26] flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Navn
              </label>
              <Input
                id="signup-fullname"
                type="text"
                placeholder="Ditt fulle navn"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-12 border-[#E2E5EC] focus:ring-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-bold text-[#1A1D26] flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                {t("email")}
              </label>
              <Input
                id="signup-email"
                type="email"
                placeholder="navn@eksempel.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 border-[#E2E5EC] focus:ring-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-bold text-[#1A1D26] flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                {t("password")}
              </label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 border-[#E2E5EC] focus:ring-blue-500 rounded-xl pr-10"
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
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Minst 8 tegn
              </p>
            </div>

            {status === "signup_error" && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">
                  {signupError}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={status === "signing_up"}
              className="w-full h-12 bg-[#1A1D26] hover:bg-black text-white font-bold rounded-xl transition-all hover:translate-y-[-2px] active:translate-y-[0px] shadow-lg shadow-black/10"
            >
              {status === "signing_up" ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Oppretter konto...
                </>
              ) : (
                <>
                  Start gratis prøveperiode
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#5E6478]">
            Har du allerede en konto?{" "}
            <Link
              href={`/${locale}/innlogging`}
              className="text-blue-600 font-bold hover:underline"
            >
              Logg inn
            </Link>
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-center max-w-sm">
        <p className="text-xs text-[#5E6478] leading-relaxed">
          Ved å registrere deg godtar du våre{" "}
          <Link href="/terms" className="underline font-medium">
            vilkår for bruk
          </Link>{" "}
          og{" "}
          <Link href="/privacy" className="underline font-medium">
            personvernerklæring
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function VerifyEmailCard({ email, locale }: { email: string; locale: string }) {
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResend = async () => {
    setResending(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    setCountdown(60);
    setCanResend(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center px-4">
      <Card className="max-w-md w-full border-[#E2E5EC] bg-white shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 p-8 pb-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-black text-[#1A1D26]">
            Sjekk e-posten din
          </CardTitle>
          <CardDescription className="text-[#5E6478]">
            Vi har sendt en bekreftelseslenke til{" "}
            <span className="font-semibold text-[#1A1D26]">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-4">
          <Button
            onClick={handleResend}
            disabled={!canResend || resending}
            variant="outline"
            className="w-full h-12 rounded-xl"
          >
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {canResend ? "Send på nytt" : `Send på nytt (${countdown}s)`}
          </Button>
          <p className="text-center text-sm text-[#5E6478]">
            <Link
              href={`/${locale}/innlogging`}
              className="text-blue-600 font-bold hover:underline"
            >
              Tilbake til innlogging
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SignupClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
