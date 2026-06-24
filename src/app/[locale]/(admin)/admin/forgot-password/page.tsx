"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/utils";
import { buildAuthRedirect } from "@/lib/auth/redirects";
import { Mail, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

export const runtime = "nodejs";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: buildAuthRedirect({ type: "admin-reset", locale }),
        },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSubmitted(true);
    } catch (_err) {
      setError(t("forgotPasswordError"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthShell mode="admin-forgot" locale={locale}>
        <AuthCard
          mode="admin-forgot"
          header={{
            icon: <CheckCircle className="h-6 w-6 text-green-500" />,
            title: t("emailSent"),
            description: t("emailSentDesc"),
          }}
        >
          <p className="mb-4 text-center text-sm text-slate-400">
            {t("checkInbox")}
          </p>
          <a
            href={`/${locale}/admin/login`}
            className="flex w-full items-center justify-center rounded-lg border border-slate-600 px-4 py-3 text-center font-semibold text-slate-300 transition-colors hover:bg-slate-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToLogin")}
          </a>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="admin-forgot" locale={locale}>
      <AuthCard
        mode="admin-forgot"
        header={{
          icon: <Mail className="h-6 w-6" />,
          title: t("forgotPassword"),
          description: t("forgotPasswordDesc"),
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthFormField
            id="admin-forgot-email"
            name="email"
            type="email"
            label={t("email")}
            placeholder="admin@klarpakke.no"
            required
            variant="admin"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
                {t("sending")}
              </>
            ) : (
              t("sendLink")
            )}
          </button>

          <div className="text-center">
            <a
              href={`/${locale}/admin/login`}
              className="flex items-center justify-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbake til login
            </a>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
