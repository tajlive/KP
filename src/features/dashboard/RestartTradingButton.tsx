"use client";

import { useState } from "react";
import { Play, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

interface RestartTradingButtonProps {
  locale: string;
  stoppedCount: number;
  crashedCount: number;
}

export function RestartTradingButton({
  locale,
  stoppedCount,
  crashedCount,
}: RestartTradingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    restarted?: number;
    message?: string;
  } | null>(null);

  const total = stoppedCount + crashedCount;
  if (total === 0 && !result?.success) return null;

  const handleRestart = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/user/trading-sessions/restart", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          success: true,
          restarted: data.restarted,
          message:
            locale === "no"
              ? `${data.restarted} session(s) restartet!`
              : `${data.restarted} session(s) restarted!`,
        });
        // Refresh page after 2 seconds
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResult({
          success: false,
          message: data.error || "Failed",
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (result?.success) {
    return (
      <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
          {result.message}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 text-sm">
          {locale === "no" ? "Laster på nytt…" : "Reloading…"}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            {locale === "no"
              ? "Trading er stoppet"
              : "Trading is stopped"}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300/80">
            {locale === "no"
              ? `${stoppedCount} stoppede + ${crashedCount} crashed session(s). Sannsynligvis pga. circuit breaker (drawdown).`
              : `${stoppedCount} stopped + ${crashedCount} crashed session(s). Likely circuit breaker (drawdown).`}
          </p>
        </div>
      </div>

      {result?.success === false && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {result.message}
        </p>
      )}

      <button
        onClick={handleRestart}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        {locale === "no" ? "Restart handel" : "Restart trading"}
      </button>
    </div>
  );
}
