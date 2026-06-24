"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/utils";
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { AuthShell, AuthCard, AuthFormField } from "@/shared/ui/auth";

export const runtime = "nodejs";

export default function AdminLoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(t("invalidCredentials"));
        return;
      }

      // Sjekk om bruker har admin-rolle via profiles view
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        await supabase.auth.signOut();
        setError(t("noAdminAccess"));
        return;
      }

      router.push(`/${locale}/admin`);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="admin-login" locale={locale}>
      <AuthCard
        mode="admin-login"
        header={{
          icon: <Lock className="h-6 w-6" />,
          title: t("adminLogin"),
          description: t("adminPortal"),
        }}
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <AuthFormField
            id="admin-login-email"
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

          <AuthFormField
            id="admin-login-password"
            name="password"
            type="password"
            label="Passord"
            placeholder="••••••••"
            required
            variant="admin"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
                {t("loggingIn")}
              </>
            ) : (
              t("login")
            )}
          </button>

          <div className="text-center">
            <a
              href={`/${locale}/admin/forgot-password`}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Glemt passord?
            </a>
          </div>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
