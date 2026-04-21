"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Bot, Pause, Play, ArrowRight, AlertTriangle } from "lucide-react";

export interface TradingSession {
  id: string;
  mode: "paper" | "live";
  status: "active" | "paused" | "stopped";
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  winning_trades: number;
  total_trades: number;
  last_heartbeat: string;
  created_at: string;
}

interface BotStatusCardProps {
  initialSession: TradingSession | null;
}

const supabase = getSupabaseClient();

export function BotStatusCard({ initialSession }: BotStatusCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "no";
  const [session, setSession] = useState<TradingSession | null>(initialSession);
  const [loading, setLoading] = useState(false);

  // Realtime subscription
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel("bot-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trading_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as TradingSession);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, supabase]);

  // Sjekk om bot ikke svarer (siste heartbeat > 5 min)
  const isNotResponding = () => {
    if (!session?.last_heartbeat) return false;
    const lastHeartbeat = new Date(session.last_heartbeat);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastHeartbeat < fiveMinutesAgo;
  };

  // Beregn P&L prosent
  const getPnLPercent = () => {
    if (!session) return 0;
    const starting = session.starting_capital_nok || 100000;
    const current = session.current_capital_nok || starting;
    return ((current - starting) / starting) * 100;
  };

  const getPnLAmount = () => {
    return session?.total_pnl || 0;
  };

  // Format relativ tid
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("dashboard.botStatus.justNow");
    if (diffMins < 60)
      return t("dashboard.botStatus.minutesAgo", { count: diffMins });
    if (diffHours < 24)
      return t("dashboard.botStatus.hoursAgo", { count: diffHours });
    return t("dashboard.botStatus.daysAgo", { count: diffDays });
  };

  // Håndter pause/resume
  const handleToggleStatus = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const newStatus = session.status === "active" ? "paused" : "active";

      const response = await fetch(
        `/api/trading-sessions/${session.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) throw new Error("Kunne ikke oppdatere status");

      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Én trading-side: alle sessions under /paper-trading
  const handleViewDetails = () => {
    if (!session) return;
    const path =
      session.mode === "live"
        ? `/${locale}/paper-trading/${session.id}?mode=live`
        : `/${locale}/paper-trading/${session.id}`;
    router.push(path);
  };

  if (!session) return null;

  const pnlPercent = getPnLPercent();
  const pnlAmount = getPnLAmount();
  const notResponding = isNotResponding();

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left side - Icon and info */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {t("dashboard.botStatus.title")}
                </h3>
                <Badge
                  variant={
                    session.status === "active" && !notResponding
                      ? "default"
                      : "secondary"
                  }
                  className={notResponding ? "bg-amber-500" : ""}
                >
                  {notResponding
                    ? t("dashboard.botStatus.notResponding")
                    : t(`dashboard.botStatus.${session.status}`)}
                </Badge>
              </div>

              {/* Trading info */}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {session.mode === "paper"
                  ? t("dashboard.botStatus.paperTrading")
                  : t("dashboard.botStatus.liveTrading")}{" "}
                · {session.trading_pair}
              </p>

              {/* Started time */}
              <p className="text-xs text-slate-500 mt-0.5">
                {t("dashboard.botStatus.started")}:{" "}
                {getRelativeTime(session.created_at)}
              </p>

              {/* Not responding warning */}
              {notResponding && (
                <div className="flex items-center gap-1.5 mt-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {t("dashboard.botStatus.notResponding")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - P&L and actions */}
          <div className="text-right">
            {/* P&L */}
            <div className="mb-3">
              <p
                className={`text-lg font-bold ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {pnlPercent >= 0 ? "+" : ""}
                {pnlPercent.toFixed(1)}%
              </p>
              <p
                className={`text-sm ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {pnlAmount >= 0 ? "+" : ""}
                {pnlAmount.toLocaleString("nb-NO")} kr
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={loading}
                className="gap-1.5"
              >
                {session.status === "active" ? (
                  <>
                    <Pause className="w-4 h-4" />
                    {t("dashboard.botStatus.pause")}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t("dashboard.botStatus.resume")}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewDetails}
                className="gap-1.5"
              >
                {t("dashboard.botStatus.viewDetails")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
