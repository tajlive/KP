"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/utils";
import {
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

export const runtime = "nodejs";

export default function AdminResetPasswordPage() {
  const locale = useLocale();
  const t = useTranslations("admin");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase handles the token from the URL hash automatically
    // When the user clicks the reset link, Supabase sets up a session
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setSessionValid(true);
        } else {
          setError(t("invalidResetLink"));
        }
      } catch {
        setError(t("verifyLinkError"));
      } finally {
        setVerifying(false);
      }
    };

    checkSession();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
    } catch (_err) {
      setError(t("resetError"));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthShell mode="admin-reset" locale={locale}>
        <AuthCard mode="admin-reset">
          <div className="p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-slate-400">{t("verifyingLink")}</p>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell mode="admin-reset" locale={locale}>
        <AuthCard
          mode="admin-reset"
          header={{
            icon: <CheckCircle className="h-6 w-6 text-green-500" />,
            title: t("passwordUpdated"),
            description: t("passwordUpdatedDesc"),
          }}
        >
          <a
            href={`/${locale}/admin/login`}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t("loginNow")}
          </a>
        </AuthCard>
      </AuthShell>
    );
  }

  if (error && !sessionValid) {
    return (
      <AuthShell mode="admin-reset" locale={locale}>
        <AuthCard
          mode="admin-reset"
          header={{
            icon: <AlertCircle className="h-6 w-6 text-red-500" />,
            title: t("invalidLink"),
            description: error,
          }}
        >
          <div className="space-y-4">
            <a
              href={`/${locale}/admin/forgot-password`}
              className="flex w-full items-center justify-center rounded-lg border border-slate-600 px-4 py-3 font-semibold text-slate-300 transition-colors hover:bg-slate-800"
            >
              {t("requestNewLink")}
            </a>
            <div className="text-center">
              <a
                href={`/${locale}/admin/login`}
                className="flex items-center justify-center gap-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("backToLogin")}
              </a>
            </div>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="admin-reset" locale={locale}>
      <AuthCard
        mode="admin-reset"
        header={{
          icon: <Lock className="h-6 w-6" />,
          title: t("resetPassword"),
          description: t("choosePassword"),
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthFormField
            id="admin-reset-password"
            name="password"
            type="password"
            label={t("newPassword")}
            placeholder="--------"
            required
            minLength={8}
            variant="admin"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <AuthFormField
            id="admin-reset-confirm"
            name="confirmPassword"
            type="password"
            label={t("confirmNewPassword")}
            placeholder="--------"
            required
            variant="admin"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-600/50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("updating")}
              </>
            ) : (
              t("saveNewPassword")
            )}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
