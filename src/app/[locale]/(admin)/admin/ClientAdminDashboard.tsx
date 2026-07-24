"use client";

import {
  getDashboardMetrics,
  type DashboardMetrics,
} from "@/actions/admin/analytics";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { createClient } from "@/lib/utils";
import {
  ArrowUp,
  Bell,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Send,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/error";

/* Realtime Activity Feed Logic */
interface Activity {
  id: string;
  type: 'user' | 'trade' | 'system';
  message: string;
  time: Date;
}

export default function ClientAdminDashboard() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin");
  const [stats, setStats] = useState<DashboardMetrics | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Email State
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { success, data, error } = await getDashboardMetrics("7d");
      if (success && data) {
        setStats(data);
      } else {
        console.error("Failed to load metrics:", error);
        toast.error("Kunne ikke laste statistikk");
      }
    } catch (err) {
      console.error("Error:", getErrorMessage(err));
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          html: `<p>${emailBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`,
        }),
      });

      if (!res.ok) throw new Error("Failed to send");

      toast.success(locale === "no" ? "E-post sendt!" : "Email sent!");
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    } catch (err) {
      console.error('Send email error:', getErrorMessage(err));
      toast.error(
        locale === "no" ? "Kunne ikke sende e-post" : "Could not send email",
      );
    } finally {
      setSending(false);
    }
  };

  const [activities, setActivities] = useState<Activity[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
  const checkSupabase = async () => {
    try {
      // KLA-auth: anon .from()-probe ga alltid stille feil — bruk
      // admin-API (getUser + allowlist) som helseprobe i stedet
      const res = await fetch("/api/admin/recent-signups", {
        credentials: "same-origin",
      });
      setSupabaseStatus(res.ok ? 'ok' : 'error');
    } catch {
      setSupabaseStatus('error');
    }
  };
  checkSupabase();
}, []);

  useEffect(() => {
    // KLA-auth: anon realtime-klient faar aldri events pga RLS —
    // 60s-polling av /api/admin/recent-signups, diff paa id for
    // aktivitetsfeed (skikkelig server-push = eget redesign)
    let knownIds: Set<string> | null = null;

    const poll = async () => {
      try {
        const res = await fetch("/api/admin/recent-signups", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const signups: { id: string; email: string | null; created_at: string }[] =
          json?.signups ?? [];

        const currentIds = new Set(signups.map((s) => s.id));
        if (knownIds !== null) {
          const fresh = signups.filter((s) => !knownIds!.has(s.id));
          if (fresh.length > 0) {
            const newActivities = fresh.map((s) => ({
              id: s.id,
              type: "user" as const,
              message:
                locale === "no"
                  ? `Ny bruker registrert: ${s.email ?? "ukjent"}`
                  : `New user registered: ${s.email ?? "unknown"}`,
              time: new Date(s.created_at),
            }));
            setActivities((prev) =>
              [...newActivities, ...prev].slice(0, 10),
            );
          }
        }
        knownIds = currentIds;
      } catch {
        // Polling-feil ignoreres stille
      }
    };

    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [locale]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/innlogging`);
  };

  const cards = [
    {
      label: t("totalUsers"),
      value: loadingStats ? "-" : stats?.total_users || 0,
      subValue: stats?.signups_today
        ? `+${stats.signups_today} i dag`
        : undefined,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Aktive Brukere (7d)",
      value: loadingStats ? "-" : stats?.active_users || 0,
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "MRR (Est.)",
      value: loadingStats ? "-" : `${stats?.mrr?.toLocaleString('nb-NO') ?? '0'} NOK`,
      icon: Trophy,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: "Konvertering",
      value: loadingStats ? "-" : `${stats?.conversion_rate}%`,
      icon: MessageSquare, // Using MessageSquare as placeholder pending better icon
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
  ];

  return (
    <div className="space-y-8 p-8 min-h-screen bg-slate-950 text-white">
      {/* Header med logg ut */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">{t("adminPanel")}</h2>
          <p className="text-slate-400 mt-2">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white font-semibold rounded-full hover:bg-yellow-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("logout")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-bold text-white">
                    {loadingStats ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      card.value
                    )}
                  </p>
                  {card.subValue && (
                    <span className="text-xs text-green-400 font-medium flex items-center">
                      <ArrowUp className="w-3 h-3 mr-0.5" />
                      {card.subValue}
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            {t("liveActivity")}
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {activities.length === 0 ? (
              <p className="text-slate-500 text-sm italic">
                {t("waitingForEvents")}
              </p>
            ) : (
              activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg animate-in slide-in-from-left"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${activity.type === "user" ? "bg-green-500" : "bg-emerald-500"}`}
                  />
                  <div>
                    <p className="text-sm text-white">{activity.message}</p>
                    <p className="text-xs text-slate-500">
                      {activity.time.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Sender */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-400" />
            {t("sendEmail")}
          </h3>
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <Input
                placeholder={t("emailTo")}
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                required
              />
            </div>
            <div>
              <Input
                placeholder={t("emailSubject")}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                required
              />
            </div>
            <div>
              <Textarea
                placeholder={t("emailBody")}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t("send")}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          {t("serviceStatus")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className={`w-3 h-3 rounded-full mb-2 animate-pulse ${
              supabaseStatus === 'ok' ? 'bg-green-500' :
              supabaseStatus === 'error' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <span className="text-slate-300 text-sm font-medium">Supabase DB</span>
            <span className={`text-xs ${
              supabaseStatus === 'ok' ? 'text-green-400' :
              supabaseStatus === 'error' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {supabaseStatus === 'ok' ? t('connected') :
               supabaseStatus === 'error' ? t('error') :
               t('checking')}
            </span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mb-2 animate-pulse" />
            <span className="text-slate-300 text-sm font-medium">
              Resend API
            </span>
            <span className="text-green-400 text-xs">
              {t("ready")}
            </span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mb-2 animate-pulse" />
            <span className="text-slate-300 text-sm font-medium">
              Cloudflare Workers
            </span>
            <span className="text-green-400 text-xs">
              {t("operational")}
            </span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mb-2 animate-pulse" />
            <span className="text-slate-300 text-sm font-medium">
              Next.js App
            </span>
            <span className="text-blue-400 text-xs">v15.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
