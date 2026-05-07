"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { SURFACE } from "@/lib/design/tokens";
import {
  BrainCircuit,
  Rocket,
  Shield,
  TrendingUp,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AutopilotLaunchPadProps {
  userId: string;
  locale: string;
  paperBalance?: number;
}

const RISK_OPTIONS = [
  { id: "conservative" as const, key: "conservative" },
  { id: "moderate" as const, key: "moderate" },
  { id: "aggressive" as const, key: "aggressive" },
] as const;

export function AutopilotLaunchPad({
  userId: _userId,
  locale,
  paperBalance,
}: AutopilotLaunchPadProps) {
  const t = useTranslations("autopilot");
  const router = useRouter();
  const [risk, setRisk] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [capital, setCapital] = useState(
    paperBalance ? Math.round(paperBalance) : 100000
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedRisk = RISK_OPTIONS.find((r) => r.id === risk)!;
  const riskData = {
    conservative: {
      emoji: t("risk.conservative.emoji"),
      label: t("risk.conservative.label"),
      desc: t("risk.conservative.desc"),
      color: "text-green-400",
      border: "border-green-500/30",
      bg: "bg-green-500/10",
    },
    moderate: {
      emoji: t("risk.moderate.emoji"),
      label: t("risk.moderate.label"),
      desc: t("risk.moderate.desc"),
      color: "text-blue-400",
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
    },
    aggressive: {
      emoji: t("risk.aggressive.emoji"),
      label: t("risk.aggressive.label"),
      desc: t("risk.aggressive.desc"),
      color: "text-orange-400",
      border: "border-orange-500/30",
      bg: "bg-orange-500/10",
    },
  } as const;
  const currentRisk = riskData[risk];

  async function handleActivate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/autopilot/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk_appetite: risk,
          total_capital_nok: capital,
          max_pairs: 3,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errors.activationFailed"));
        return;
      }

      if (data.ok) {
        setSuccess(true);
        // Redirect etter 2 sekunder
        setTimeout(() => {
          router.push(`/${locale}/dashboard/autopilot`);
        }, 2000);
      } else {
        setError(data.reason || "Ingen kvalifiserende signaler. Markedet er ugunstig.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={`min-h-[400px] flex flex-col items-center justify-center gap-6 p-8 ${SURFACE.BG} rounded-2xl border border-white/10`}>
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h2 className={`text-2xl font-bold ${SURFACE.TEXT}`}>🤖 {t("monitor.status.active")}!</h2>
        <p className={`${SURFACE.TEXT_MUTED} text-center max-w-sm`}>
          {t("subtitle")}
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-xl mx-auto p-6 ${SURFACE.BG} rounded-2xl border border-white/10 space-y-6`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto">
          <BrainCircuit className="w-7 h-7 text-indigo-400" />
        </div>
        <h1 className={`text-2xl font-bold ${SURFACE.TEXT}`}>{t("title")}</h1>
        <p className={`${SURFACE.TEXT_MUTED} text-sm`}>
          {t("subtitle")}
        </p>
      </div>

      {/* Risk Selector */}
      <div className="space-y-3">
        <label htmlFor="risk-selector" className={`text-sm font-medium ${SURFACE.TEXT}`}>{t("risk.title")}</label>
        <div id="risk-selector" className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Risikonivå">
          {RISK_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setRisk(option.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                risk === option.id
                  ? `${riskData[option.key].border} ${riskData[option.key].bg} ring-1 ring-white/20`
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <span className="text-lg">{riskData[option.key].emoji}</span>
              <div className={`text-xs font-semibold mt-1 ${SURFACE.TEXT}`}>
                {riskData[option.key].label}
              </div>
            </button>
          ))}
        </div>
        <p className={`text-xs ${currentRisk.color}`}>
          {currentRisk.desc}
        </p>
      </div>

      {/* Capital Input */}
      <div className="space-y-2">
        <label htmlFor="capital-input" className={`text-sm font-medium ${SURFACE.TEXT}`}>{t("capital.title")} (NOK)</label>
        <div className="relative">
          <input
            id="capital-input"
            type="number"
            value={capital}
            onChange={(e) => setCapital(Math.max(10000, Math.min(1000000, Number(e.target.value))))}
            className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 ${SURFACE.TEXT} focus:outline-none focus:border-indigo-500/50 transition-colors`}
            min={10000}
            max={1000000}
            step={1000}
          />
          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${SURFACE.TEXT_MUTED}`}>
            NOK
          </span>
        </div>
      </div>

      {/* Stats / Social Proof */}
      <div className="grid grid-cols-3 gap-3 py-2">
        <div className="text-center">
          <div className={`text-lg font-bold ${SURFACE.TEXT}`}>+12.4%</div>
          <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>{t("monitor.pnl")} 30d</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${SURFACE.TEXT}`}>67%</div>
          <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>{t("monitor.trades")}</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${SURFACE.TEXT}`}>8.2%</div>
          <div className={`text-xs ${SURFACE.TEXT_MUTED}`}>Max DD</div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className={`text-xs ${SURFACE.TEXT_MUTED}`}>
          {t("subtitle")}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Activate Button */}
      <Button
        onClick={handleActivate}
        disabled={loading}
        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Rocket className="w-5 h-5 mr-2" />
            {t("activate")}
          </>
        )}
      </Button>

      <p className={`text-center text-xs ${SURFACE.TEXT_MUTED}`}>
        {t("subtitle")}
      </p>
    </div>
  );
}
