"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordClient() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(
        locale === "en"
          ? "Password must be at least 8 characters"
          : "Passordet må være minst 8 tegn",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.updateUser({
        password: password,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/innlogging`);
      }, 3000);
    } catch (_err) {
      setError(t("resetPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4">
      <DotPattern
        className={cn(
          "mask-[radial-gradient(400px_circle_at_center,white,transparent)]",
          "absolute inset-0 h-full w-full fill-white/10",
        )}
      />

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            {!success ? (
              <div className="mx-auto w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-blue-500" />
              </div>
            ) : (
              <div className="mx-auto w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            )}
            <CardTitle className="text-white text-2xl font-bold">
              {success ? t("resetPassword.success") : t("resetPassword.title")}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              {success
                ? locale === "en"
                  ? "Redirecting to login..."
                  : "Sender deg til innlogging..."
                : t("resetPassword.desc")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-password-new" className="block text-sm font-medium text-slate-300 mb-1.5">
                    {t("resetPassword.label")}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="reset-password-new"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("resetPassword.placeholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                      aria-label={
                        showPassword ? "Skjul passord" : "Vis passord"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/20 py-3"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-400 text-sm ml-2">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-linear-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/20"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("resetPassword.submit")}
                    </>
                  ) : (
                    t("resetPassword.submit")
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href={`/${locale}/innlogging`}>
                    Logg inn nå
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
