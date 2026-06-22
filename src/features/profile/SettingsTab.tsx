"use client";

import { createClient } from "@/lib/utils";
import { buildAuthRedirect } from "@/lib/auth/redirects";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  Palette,
  Trophy,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { ThemeSettings } from "@/features/settings/ThemeSettings";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailPrefs {
  gamification_emails: boolean;
  trading_alerts: boolean;
  transaction_emails: boolean;
  digest_emails: "daily" | "weekly" | "never";
  marketing_emails: boolean;
}

const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  gamification_emails: true,
  trading_alerts: true,
  transaction_emails: true,
  digest_emails: "weekly",
  marketing_emails: false,
};

// ─── Email Preferences Section ───────────────────────────────────────────────

function EmailPrefsSection() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<EmailPrefs>(DEFAULT_EMAIL_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  async function loadPrefs() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPrefs({
          gamification_emails: data.gamification_emails ?? true,
          trading_alerts: data.trading_alerts ?? true,
          transaction_emails: data.transaction_emails ?? true,
          digest_emails:
            (data.digest_emails as "daily" | "weekly" | "never") ?? "weekly",
          marketing_emails: data.marketing_emails ?? false,
        });
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs(newPrefs: EmailPrefs) {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("email_preferences")
        .upsert(
          {
            user_id: user.id,
            ...newPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;

      setPrefs(newPrefs);
      toast.success("E-postinnstillinger lagret");
    } catch {
      toast.error("Kunne ikke lagre innstillinger");
    } finally {
      setSaving(false);
    }
  }

  const toggle = (key: keyof Omit<EmailPrefs, "digest_emails">) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
  };

  const setDigest = (val: EmailPrefs["digest_emails"]) => {
    savePrefs({ ...prefs, digest_emails: val });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const rows: {
    key: keyof Omit<EmailPrefs, "digest_emails">;
    icon: React.ReactNode;
    label: string;
    desc: string;
    always?: boolean;
  }[] = [
    {
      key: "transaction_emails",
      icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      label: "Transaksjonsbekreftelser",
      desc: "Abonnements- og betalingskvitteringer",
      always: true,
    },
    {
      key: "trading_alerts",
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      label: "Trading-varsler",
      desc: "Bot-krasj, trade utført, bot gjenoppstartet",
    },
    {
      key: "gamification_emails",
      icon: <Trophy className="w-5 h-5 text-blue-400" />,
      label: "Gamification",
      desc: "Level up, leaderboard-klatring, XP-milepæler",
    },
    {
      key: "marketing_emails",
      icon: <Mail className="w-5 h-5 text-purple-400" />,
      label: "Nyheter og tilbud",
      desc: "Nye funksjoner, kampanjer og oppdateringer",
    },
  ];

  return (
    <div className="space-y-4">
      {rows.map(({ key, icon, label, desc, always }) => (
        <div key={key} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
              {always && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Kan ikke slås av
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={prefs[key] as boolean}
            onCheckedChange={() => toggle(key)}
            disabled={saving || always}
          />
        </div>
      ))}

      {/* Digest frequency */}
      <div className="pt-4 border-t border-slate-800">
        <p className="text-sm font-medium text-slate-200 mb-3">
          Oppsummering via e-post
        </p>
        <div className="flex gap-2">
          {(["daily", "weekly", "never"] as const).map((val) => (
            <button
              key={val}
              onClick={() => setDigest(val)}
              disabled={saving}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                prefs.digest_emails === val
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {val === "daily"
                ? "Daglig"
                : val === "weekly"
                  ? "Ukentlig"
                  : "Aldri"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Password Section ────────────────────────────────────────────────────────

function PasswordSection() {
  const supabase = createClient();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendReset() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: buildAuthRedirect({ type: "password-reset", locale }),
      });
      if (error) throw error;

      setSent(true);
      toast.success("Tilbakestillingslenke sendt til " + user.email);
    } catch {
      toast.error("Kunne ikke sende e-post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-200">Passord</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Vi sender en tilbakestillingslenke til e-posten din
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={sendReset}
        disabled={loading || sent}
        className="border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : sent ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
            Sendt
          </>
        ) : (
          "Endre passord"
        )}
      </Button>
    </div>
  );
}

function BillingPortalSection() {
  const t = useTranslations("settings.billing");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error || t("error"));
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{t("title")}</p>
        <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
          {t("description")}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openPortal}
        disabled={loading}
        className="border-slate-700 text-slate-200 hover:bg-slate-800 shrink-0"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" aria-hidden />
        )}
        {loading ? t("loading") : t("cta")}
      </Button>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-kp-bg-secondary border border-kp-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-base font-semibold text-kp-text-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function SettingsTab() {
  const t = useTranslations("settings.billing");
  
  return (
    <div className="space-y-6">
      {/* Billing */}
      <Section
        icon={<CreditCard className="w-5 h-5 text-violet-400" />}
        title={t("sectionTitle")}
      >
        <BillingPortalSection />
      </Section>

      {/* Theme */}
      <Section
        icon={<Palette className="w-5 h-5 text-pink-400" />}
        title="Utseende"
      >
        <ThemeSettings />
      </Section>

      {/* Email */}
      <Section
        icon={<Mail className="w-5 h-5 text-blue-400" />}
        title="E-postvarsler"
      >
        <EmailPrefsSection />
      </Section>

      {/* Security */}
      <Section
        icon={<Lock className="w-5 h-5 text-green-400" />}
        title="Sikkerhet"
      >
        <PasswordSection />
      </Section>
    </div>
  );
}
