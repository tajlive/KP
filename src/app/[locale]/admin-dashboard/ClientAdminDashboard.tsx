"use client";

import { ErrorMonitor } from "@/components/admin/ErrorMonitor";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/utils";
import {
  AlertCircle,
  BarChart3,
  Bot,
  CheckCircle,
  Gamepad2,
  Loader2,
  MousePointer,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AdminStats {
  totalUsers: number;
  totalSignups: number;
  signupsToday: number;
  signupsWeek: number;
  remaining: number;
  percentage: number;
  clickCount: number;
  conversionRate: number;
  paperTradingUsers: number;
  autoTradingUsers: number;
  channels: {
    linkedin: number;
    email: number;
    facebook: number;
    direct: number;
  };
  funnel: Array<{
    name: string;
    label: string;
    uniqueUsers: number;
    dropOff: number;
    dropOffRate: number;
  }>;
  is_fallback: boolean;
  updated_at: string;
}

export default function ClientAdminDashboard() {
  const t = useTranslations("adminDashboard");
  const td = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const locale = pathname.split("/")[1] || "no";
        const supportedLocales = ["no", "en", "th", "zh"];
        const safeLocale = supportedLocales.includes(locale) ? locale : "no";
        router.push(
          `/${safeLocale}/innlogging?next=${encodeURIComponent(pathname)}`,
        );
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, email, subscription_tier")
        .eq("id", user.id)
        .single();

      if (
        error ||
        (profile?.role !== "admin" &&
          profile?.subscription_tier !== "professor")
      ) {
        setError(t("noAccess.title"));
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setAdminEmail(profile.email);
      fetchStats();
    } catch (err) {
      setError(t("noAccess.title"));
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Kunne ikke hente statistikk");

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(t("noAccess.title"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600 font-medium">{t("verifying")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 max-w-md w-full text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {t("noAccess.title")}
          </h1>
          <p className="text-slate-600 mb-8">{error}</p>
          <Link href="/">
            <Button
              size="lg"
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {t("noAccess.backToHome")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin || !stats) return null;

  const statCards = [
    {
      label: t("stats.totalRegistered"),
      value: stats.totalSignups,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      subtitle: t("stats.spotsLeft", { remaining: stats.remaining }),
    },
    {
      label: t("stats.signedUpToday"),
      value: stats.signupsToday,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      subtitle: t("stats.signedUpToday"),
    },
    {
      label: t("stats.totalClicks"),
      value: stats.clickCount,
      icon: MousePointer,
      color: "text-amber-600",
      bg: "bg-amber-50",
      subtitle: t("stats.allChannels"),
    },
    {
      label: t("stats.conversion"),
      value: `${stats.conversionRate}%`,
      icon: Target,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      subtitle: t("stats.clickToReg"),
    },
    {
      label: td("paperTrading"),
      value: stats.paperTradingUsers,
      icon: Gamepad2,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      subtitle: t("stats.activeUsers"),
    },
    {
      label: td("trading"),
      value: stats.autoTradingUsers,
      icon: Bot,
      color: "text-pink-600",
      bg: "bg-pink-50",
      subtitle: t("stats.activeUsers"),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-slate-900">
                {t("title")}
              </h2>
              <span className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full flex items-center gap-1 font-medium border border-green-100">
                <CheckCircle className="w-4 h-4" />
                Admin
              </span>
            </div>
            <p className="text-slate-500">
              {t("header.subtitle", { email: adminEmail })}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("search.placeholder")}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-64"
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t("campaign.title")}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {t("campaign.spotsFilled", { total: stats.totalSignups })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-extrabold text-[#FF5B24] tracking-tight">
                {stats.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF5B24] to-[#FF8C61] transition-all duration-1000 ease-out shadow-lg shadow-orange-500/20"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:overflow-visible md:pb-0 md:px-0 mb-8">
          <div className="flex flex-nowrap md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 min-w-full md:min-w-0">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm min-w-[280px] md:min-w-0 flex-shrink-0 snap-center"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {card.value}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {card.subtitle}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Breakdown & Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Channels */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {t("trafficSources.title")}
            </h3>
            <div className="space-y-6">
              {[
                {
                  label: "LinkedIn",
                  value: stats.channels.linkedin,
                  color: "bg-blue-600",
                },
                {
                  label: "Email",
                  value: stats.channels.email,
                  color: "bg-green-600",
                },
                {
                  label: "Facebook",
                  value: stats.channels.facebook,
                  color: "bg-indigo-600",
                },
                {
                  label: t("trafficSources.direct"),
                  value: stats.channels.direct,
                  color: "bg-slate-600",
                },
              ].map((channel) => {
                const total =
                  stats.channels.linkedin +
                  stats.channels.email +
                  stats.channels.facebook +
                  stats.channels.direct;
                const percentage =
                  total > 0 ? (channel.value / total) * 100 : 0;

                return (
                  <div key={channel.label}>
                    <div className="flex justify-between text-sm mb-2 font-medium">
                      <span className="text-slate-700">{channel.label}</span>
                      <span className="text-slate-500">
                        {channel.value} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${channel.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              {t("funnel.title")}
            </h3>
            {stats.funnel && stats.funnel.length > 0 ? (
              <div className="space-y-4">
                {stats.funnel.map((step, index) => (
                  <div
                    key={step.name}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-500 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-900">{step.label}</span>
                        <span className="text-slate-600">
                          {step.uniqueUsers}
                        </span>
                      </div>
                      {step.dropOff > 0 && (
                        <div className="text-xs text-red-500 mt-1 font-medium">
                          {t("funnel.falloff", {
                            count: step.dropOff,
                            rate: step.dropOffRate,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic text-center py-8">
                {t("funnel.noData")}
              </p>
            )}
          </div>
        </div>

        {/* Error Monitor */}
        <div className="mb-8">
          <ErrorMonitor />
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs py-8 border-t border-slate-200">
          <p>
            {t("footer.lastUpdated", {
              date: new Date(stats.updated_at).toLocaleString("nb-NO"),
            })}
          </p>
          {stats.is_fallback && (
            <span className="inline-block mt-2 px-2 py-1 bg-yellow-50 text-yellow-600 rounded border border-yellow-100">
              {t("footer.fallbackData")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
