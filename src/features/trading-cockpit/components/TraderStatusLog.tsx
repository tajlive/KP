"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { nb, enUS } from "date-fns/locale";
import { ChevronDown, ChevronUp, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CockpitMode } from "@/features/trading-cockpit/types";

type TradingLogAction = "regime_signal" | "trade_executed" | "live_trade_failed";

interface TradingLogDetails {
  pair?: string;
  amount?: number | string;
  reason?: string;
  regime?: string;
  ensemble_score?: number;
  side?: string;
  [key: string]: unknown;
}

interface TradingLogRow {
  action: TradingLogAction;
  details: TradingLogDetails | null;
  created_at: string | null;
}

interface TraderStatusLogProps {
  sessionId: string | null;
  mode: CockpitMode;
  className?: string;
}

const RECENT_MINUTES = 5;

function isRecent(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const then = new Date(createdAt).getTime();
  const now = Date.now();
  return Number.isFinite(then) && now - then <= RECENT_MINUTES * 60 * 1000;
}

function minutesAgo(createdAt: string | null): number | null {
  if (!createdAt) return null;
  const then = new Date(createdAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.round((now - then) / 60_000));
}

export function TraderStatusLog({
  sessionId,
  mode,
  className,
}: TraderStatusLogProps) {
  const t = useTranslations("trading.cockpit.statusLog");
  const locale = useLocale();
  const dateLocale = locale === "no" ? nb : enUS;
  const [expanded, setExpanded] = React.useState(true);
  const [logs, setLogs] = React.useState<TradingLogRow[]>([]);
  const [lastTickAt, setLastTickAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!sessionId) {
      setLogs([]);
      setLastTickAt(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // KLA-auth: browser-klienten er alltid anon — logger hentes via
        // server-API (user_id-scopet)
        const res = await fetch(
          `/api/user/trading-logs?session_id=${encodeURIComponent(sessionId as string)}`,
          { credentials: "same-origin" },
        );
        if (cancelled || !res.ok) return;
        const json = await res.json().catch(() => null);

        setLogs(
          ((json?.logs ?? []) as TradingLogRow[]).map((row) => ({
            action: row.action as TradingLogAction,
            details: (row.details as TradingLogDetails | null) ?? null,
            created_at: row.created_at,
          })),
        );
        setLastTickAt(json?.lastTickAt ? String(json.lastTickAt) : null);
      } catch (err) {
        console.error("[TraderStatusLog] failed to load logs:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const latestLog = logs[0] ?? null;

  const whyHolding = React.useMemo(() => {
    if (!sessionId) return null;

    if (latestLog?.action === "regime_signal") {
      const regime = latestLog.details?.regime;
      const score = latestLog.details?.ensemble_score;
      if (typeof regime === "string" && typeof score === "number") {
        return {
          text: t("holdingRegime", { regime, score: String(score) }),
          warning: false,
        };
      }
    }

    if (latestLog?.action === "live_trade_failed") {
      const reason = latestLog.details?.reason;
      if (typeof reason === "string" && reason.length > 0) {
        return {
          text: t("holdingBlocked", { reason }),
          warning: false,
        };
      }
    }

    if (latestLog && latestLog.created_at) {
      return {
        text: t("evaluatingSignals"),
        warning: false,
      };
    }

    const lastTick = lastTickAt ?? latestLog?.created_at;
    if (isRecent(lastTick)) {
      return {
        text: t("evaluatingSignals"),
        warning: false,
      };
    }

    const minutes = minutesAgo(lastTick);
    if (minutes !== null) {
      return {
        text: t("noTickWarning", { minutes: String(minutes) }),
        warning: true,
      };
    }

    return {
      text: t("noRecentDecisions"),
      warning: false,
    };
  }, [latestLog, lastTickAt, sessionId, t]);

  function renderLogLine(log: TradingLogRow): string {
    const details = log.details;
    switch (log.action) {
      case "trade_executed": {
        const pair = details?.pair ?? "—";
        const amount = details?.amount ?? "—";
        const reason = details?.reason ?? "";
        return reason
          ? t("tradeExecuted", { pair, amount: String(amount), reason })
          : t("tradeExecutedNoReason", { pair, amount: String(amount) });
      }
      case "live_trade_failed": {
        const reason = details?.reason ?? "";
        return reason ? t("tradeFailed", { reason }) : t("tradeFailedNoReason");
      }
      case "regime_signal": {
        const regime = details?.regime ?? "—";
        const score = details?.ensemble_score ?? "—";
        return t("regimeSignal", { regime, ensemble_score: String(score) });
      }
      default:
        return "";
    }
  }

  return (
    <Card className={cn("bg-kp-bg-card border-kp-border rounded-2xl", className)}>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={expanded}
        >
          <CardTitle className="text-base font-semibold text-kp-text-primary flex items-center gap-2">
            <Activity className="w-4 h-4 text-kp-brand" />
            {t("title")}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-kp-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-kp-text-secondary" />
          )}
        </button>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {sessionId && whyHolding && (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                whyHolding.warning
                  ? "border-kp-warning/30 bg-kp-warning/10 text-kp-warning"
                  : "border-kp-border bg-kp-bg-secondary text-kp-text-secondary",
              )}
            >
              <div className="flex items-start gap-2">
                {whyHolding.warning ? (
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 mt-0.5 shrink-0 text-kp-brand" />
                )}
                <span>{whyHolding.text}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {loading && logs.length === 0 ? (
              <p className="text-sm text-kp-text-secondary">{t("loading")}</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-kp-text-secondary">{t("noRecentDecisions")}</p>
            ) : (
              logs.map((log, index) => {
                const line = renderLogLine(log);
                if (!line) return null;
                const when = log.created_at
                  ? formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })
                  : "";
                return (
                  <div
                    key={`${log.action}-${log.created_at ?? index}-${index}`}
                    className="flex items-start justify-between gap-3 py-2 border-b border-kp-border last:border-0"
                  >
                    <span className="text-sm text-kp-text-primary">{line}</span>
                    {when && (
                      <span className="text-xs text-kp-text-secondary whitespace-nowrap">
                        {when}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
