"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Lock,
  CheckCircle2,
  Sparkles,
  BarChart2,
  TrendingUp,
  Grid3X3,
  Target,
  Bot,
} from "lucide-react";
import { BRAND, SURFACE } from "@/lib/design/tokens";

interface BotWizardProps {
  userId: string;
  locale: string;
  tier: string;
  /** Saldo fra profil (lekepenger) — brukes som forslag til startkapital */
  paperBalance?: number | string | null;
}

function clampPaperCapital(n: number) {
  return Math.max(10_000, Math.min(1_000_000, Math.round(n)));
}

const TIER_ORDER = ["student", "bachelor", "master", "phd", "professor"];

const TIER_COIN_LIMIT: Record<string, number> = {
  student: 3,
  bachelor: 5,
  master: 10,
  phd: 10,
  professor: 10,
};

const COINS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "LINKUSDT",
  "DOGEUSDT",
];

function tierMeetsRequirement(userTier: string, requiredTier: string) {
  const normalizedUser = userTier.toLowerCase();
  const normalizedRequired = requiredTier.toLowerCase();
  const userIdx = TIER_ORDER.indexOf(normalizedUser);
  const requiredIdx = TIER_ORDER.indexOf(normalizedRequired);
  if (userIdx === -1) return false;
  if (requiredIdx === -1) return true;
  return userIdx >= requiredIdx;
}

export function BotWizard({
  userId: _userId,
  locale,
  tier: rawTier,
  paperBalance,
}: BotWizardProps) {
  const tToast = useTranslations("toasts");
  const router = useRouter();
  const tier = rawTier?.toLowerCase() || "student";
  const [step, setStep] = useState(1);
  const [strategy, setStrategy] = useState("dca");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["BTCUSDT"]);
  const [startingCapital, setStartingCapital] = useState(() => {
    const raw =
      paperBalance === null || paperBalance === undefined
        ? NaN
        : typeof paperBalance === "number"
          ? paperBalance
          : Number(paperBalance);
    const base = Number.isFinite(raw) && raw > 0 ? raw : 100_000;
    return clampPaperCapital(base);
  });
  /** Tillat tom/mellomtilstand i feltet uten at tall «forsvinner» visuelt */
  const [capitalDraft, setCapitalDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capitalInputValue =
    capitalDraft !== null ? capitalDraft : String(startingCapital);

  const onCapitalInputChange = useCallback((raw: string) => {
    setCapitalDraft(raw);
    const cleaned = raw.replace(/\s/g, "");
    if (cleaned === "" || cleaned === "-") return;
    const v = Number(cleaned);
    if (!Number.isNaN(v)) {
      setStartingCapital(clampPaperCapital(v));
    }
  }, []);

  const onCapitalInputBlur = useCallback(() => {
    setCapitalDraft(null);
    setStartingCapital((prev) => clampPaperCapital(prev));
  }, []);

  const isNo = locale === "no";
  const coinLimit = TIER_COIN_LIMIT[tier] ?? 3;

  const STRATEGIES = [
    {
      id: "dca",
      name: "DCA",
      description: isNo
        ? "Dollar Cost Averaging — kjøp automatisk til fast tid"
        : "Dollar Cost Averaging — buy automatically on schedule",
      Icon: BarChart2,
      tier: "student",
      recommended: true,
    },
    {
      id: "trend",
      name: "Trend Following",
      description: isNo
        ? "Følg markedstrenden med teknisk analyse"
        : "Follow market trends with technical analysis",
      Icon: TrendingUp,
      tier: "bachelor",
    },
    {
      id: "grid",
      name: "Grid Trading",
      description: isNo
        ? "Kjøp lavt, selg høyt i et prisbånd"
        : "Buy low, sell high within a price range",
      Icon: Grid3X3,
      tier: "bachelor",
    },
    {
      id: "multi",
      name: "Multi-Signal",
      description: isNo
        ? "Kombiner flere indikatorer for signaler"
        : "Combine multiple indicators for signals",
      Icon: Target,
      tier: "master",
    },
    {
      id: "ai-copy",
      name: "AI Copy Trading",
      description: isNo
        ? "Kopier topphandlernes strategier med AI"
        : "Copy top traders with AI",
      Icon: Bot,
      tier: "master",
    },
  ];

  const RISK_OPTIONS: {
    value: "low" | "medium" | "high";
    label: string;
    description: string;
    color: string;
  }[] = [
    {
      value: "low",
      label: isNo ? "Lav risiko" : "Low risk",
      description: isNo ? "Sakte og stabil vekst" : "Slow and steady growth",
      color: "#22C55E",
    },
    {
      value: "medium",
      label: isNo ? "Middels risiko" : "Medium risk",
      description: isNo ? "Balansert" : "Balanced",
      color: "#F59E0B",
    },
    {
      value: "high",
      label: isNo ? "Høy risiko" : "High risk",
      description: isNo ? "Aggressiv strategi" : "Aggressive strategy",
      color: "#EF4444",
    },
  ];

  const toggleCoin = (coin: string) => {
    setSelectedPairs((prev) => {
      if (prev.includes(coin)) {
        return prev.filter((c) => c !== coin);
      }
      if (prev.length >= coinLimit) return prev;
      return [...prev, coin];
    });
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auto-trading/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          risk_level: riskLevel,
          pairs: selectedPairs,
          starting_capital_nok: startingCapital,
        }),
      });
      let data: {
        ok?: boolean;
        code?: string;
        message?: string;
        error?: string;
        session_id?: string;
        reused_session?: boolean;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        toast.error(tToast("paperBot.startFailedTitle"), {
          description: tToast("paperBot.networkError"),
        });
        return;
      }

      if (!res.ok || !data.ok) {
        toast.error(tToast("paperBot.startFailedTitle"), {
          description:
            typeof data.error === "string"
              ? data.error
              : typeof data.message === "string"
                ? data.message
                : undefined,
        });
        return;
      }

      if (data.reused_session) {
        toast.info(tToast("paperBot.alreadyActiveTitle"), {
          description: tToast("paperBot.alreadyActiveDesc"),
        });
      } else {
        toast.success(tToast("paperBot.startedTitle"), {
          description: tToast("paperBot.startedDesc"),
        });
      }
      if (data.session_id) {
        router.push(`/${locale}/dashboard/bot/${data.session_id}`);
        return;
      }
      router.push(`/${locale}/dashboard/auto-trade`);
    } catch (err) {
      console.error(err);
      toast.error(tToast("paperBot.startFailedTitle"), {
        description: tToast("paperBot.networkError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = [
    isNo ? "Strategi" : "Strategy",
    isNo ? "Beløp & valuta" : "Amount & coins",
    isNo ? "Start" : "Start",
  ];
  const CAPITAL_PRESETS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

  const selectedStrategy = STRATEGIES.find((s) => s.id === strategy);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-36 md:pb-28 relative z-10">
      <h1 className="text-2xl font-bold text-[#1A1D26] dark:text-white mb-4">
        {isNo ? "Start trading-bot" : "Start trading bot"}
      </h1>

      {tier === "student" && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-[#E8F0FE] dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 px-4 py-3">
          <p className="text-sm text-[#1A1D26] dark:text-slate-200">
            {isNo
              ? "Du har 1 strategi inkludert. Oppgrader for flere strategier og flere valutaer."
              : "You get 1 strategy included. Upgrade for more strategies and coins."}
          </p>
          <Link
            href={`/${locale}/priser`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#0052FF] px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-4 w-4" />
            {isNo ? "Se planer" : "See plans"}
          </Link>
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isPast = step > stepNum;

          return (
            <div key={stepNum} className="flex items-center">
              {i > 0 && (
                <div
                  className={`w-16 h-0.5 sm:w-24 ${isPast ? "bg-[#22C55E]" : "bg-[#E2E5EC] dark:bg-slate-600"}`}
                />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: isPast
                      ? "#22C55E"
                      : isActive
                        ? "#0052FF"
                        : "transparent",
                    border: !isPast && !isActive ? "2px solid #B4BFCE" : "none",
                    color: isPast || isActive ? "#FFFFFF" : "#B4BFCE",
                  }}
                >
                  {isPast ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: isActive
                      ? "#0052FF"
                      : isPast
                        ? "#22C55E"
                        : "#B4BFCE",
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Strategy */}
      {step === 1 && (
        <div className="relative z-10">
          <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-1">
            {isNo ? "Velg strategi" : "Choose strategy"}
          </h2>
          <p className="text-sm text-[#5E6478] dark:text-slate-400 mb-4">
            {selectedStrategy
              ? isNo
                ? `${selectedStrategy.name} er valgt — trykk Neste for å fortsette`
                : `${selectedStrategy.name} selected — tap Next to continue`
              : isNo
                ? "Klikk på en strategi for å velge"
                : "Tap a strategy to select"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {STRATEGIES.map((s) => {
              const locked = !tierMeetsRequirement(tier, s.tier);
              const selected = strategy === s.id && !locked;

              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={locked}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!locked) setStrategy(s.id);
                  }}
                  className={`relative z-10 text-left bg-white dark:bg-slate-900 rounded-xl p-5 transition-all touch-manipulation ${
                    locked
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-[#0052FF]/50"
                  } ${
                    selected
                      ? "ring-2 ring-[#0052FF] border border-[#0052FF]"
                      : "border border-[#E2E5EC] dark:border-slate-700 hover:border-[#B4BFCE] dark:hover:border-slate-600"
                  } shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}
                >
                  {s.recommended && (
                    <span className="absolute top-3 right-3 bg-[#DCFCE7] text-[#16A34A] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {isNo ? "Anbefalt" : "Recommended"}
                    </span>
                  )}
                  {locked && (
                    <span
                      className="absolute top-3 right-3 flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-[11px] font-semibold px-2 py-1 rounded-md"
                      title={
                        isNo
                          ? `Oppgrader til ${s.tier} for å bruke denne strategien`
                          : `Upgrade to ${s.tier} to use this strategy`
                      }
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      {isNo ? "Krever" : "Requires"}{" "}
                      {s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}
                    </span>
                  )}
                  <span className="block mb-3 text-[#0052FF]">
                    <s.Icon className="w-8 h-8" />
                  </span>
                  <span className="text-sm font-bold text-[#1A1D26] dark:text-white block mb-1">
                    {s.name}
                  </span>
                  <span className="text-xs text-[#5E6478] dark:text-slate-400 leading-relaxed block">
                    {s.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Risk & Coins */}
      {step === 2 && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-4">
              {isNo ? "Velg risikonivå" : "Choose risk level"}
            </h2>
            <div className="space-y-3">
              {RISK_OPTIONS.map((r) => {
                const selected = riskLevel === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRiskLevel(r.value)}
                    className={`w-full text-left bg-white dark:bg-slate-900 rounded-xl p-4 transition-all flex items-center gap-4 ${
                      selected
                        ? "ring-2 ring-[#0052FF] border border-[#0052FF]"
                        : "border border-[#E2E5EC] dark:border-slate-700 hover:border-[#B4BFCE] dark:hover:border-slate-600"
                    } shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}
                    style={{ borderLeft: `4px solid ${r.color}` }}
                  >
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-[#1A1D26] dark:text-white block">
                        {r.label}
                      </span>
                      <span className="text-xs text-[#5E6478] dark:text-slate-400">
                        {r.description}
                      </span>
                    </div>
                    {selected && (
                      <CheckCircle2 className="w-5 h-5 text-[#0052FF] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-1">
              {isNo ? "Startkapital (lekepenger)" : "Starting capital (paper)"}
            </h2>
            <p className="text-xs text-[#5E6478] dark:text-slate-400 mb-3">
              {isNo
                ? "Beløpet boten handler med i papirmodus."
                : "Amount the bot trades with in paper mode."}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CAPITAL_PRESETS.map((preset) => {
                const selected = startingCapital === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCapitalDraft(null);
                      setStartingCapital(preset);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selected
                        ? `${BRAND.primary}`
                        : "bg-[#F1F3F9] dark:bg-slate-800 text-[#5E6478] dark:text-slate-300 hover:bg-[#E2E5EC] dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset >= 1_000_000 ? "1M" : `${preset / 1000}k`} kr
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mb-6">
              <label
                htmlFor="capital-input"
                className="text-sm text-[#5E6478] dark:text-slate-400 shrink-0"
              >
                {isNo ? "Eget beløp:" : "Custom amount:"}
              </label>
              <input
                id="capital-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={capitalInputValue}
                onChange={(e) => onCapitalInputChange(e.target.value)}
                onBlur={onCapitalInputBlur}
                className="min-w-[9rem] max-w-[12rem] flex-1 px-3 py-2.5 rounded-lg border border-[#E2E5EC] dark:border-slate-600 bg-white dark:bg-slate-900 text-[#1A1D26] dark:text-white font-medium tabular-nums text-base shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <span className="text-sm text-[#5E6478] dark:text-slate-400">
                kr
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-1">
              {isNo ? "Velg kryptovaluta" : "Select coins"}
            </h2>
            <p className="text-xs text-[#5E6478] dark:text-slate-400 mb-4">
              {isNo
                ? `Maks ${coinLimit} valutaer for ${tier.charAt(0).toUpperCase() + tier.slice(1)}-nivå`
                : `Max ${coinLimit} coins for ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier`}
            </p>
            <div className="flex flex-wrap gap-2">
              {COINS.map((coin) => {
                const selected = selectedPairs.includes(coin);
                const symbol = coin.replace("USDT", "");
                return (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => toggleCoin(coin)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selected
                        ? `${BRAND.primary}`
                        : "bg-[#F1F3F9] dark:bg-slate-800 text-[#5E6478] dark:text-slate-300 hover:bg-[#E2E5EC] dark:hover:bg-slate-700"
                    }`}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Start */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-[#1A1D26] dark:text-white mb-4">
            {isNo ? "Oppsummering" : "Summary"}
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E5EC] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478] dark:text-slate-400">
                {isNo ? "Strategi" : "Strategy"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26] dark:text-white">
                {selectedStrategy?.Icon != null ? (
                  <selectedStrategy.Icon className="w-4 h-4 inline-block align-middle mr-1" />
                ) : null}{" "}
                {selectedStrategy?.name}
              </span>
            </div>
            <div className="h-px bg-[#E2E5EC] dark:bg-slate-700" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478] dark:text-slate-400">
                {isNo ? "Risikonivå" : "Risk level"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26] dark:text-white capitalize">
                {riskLevel === "low"
                  ? isNo
                    ? "Lav"
                    : "Low"
                  : riskLevel === "medium"
                    ? isNo
                      ? "Middels"
                      : "Medium"
                    : isNo
                      ? "Høy"
                      : "High"}
              </span>
            </div>
            <div className="h-px bg-[#E2E5EC] dark:bg-slate-700" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478] dark:text-slate-400">
                {isNo ? "Valutaer" : "Coins"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26] dark:text-white">
                {selectedPairs.map((p) => p.replace("USDT", "")).join(", ")}
              </span>
            </div>
            <div className="h-px bg-[#E2E5EC] dark:bg-slate-700" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478] dark:text-slate-400">
                {isNo
                  ? "Startkapital (lekepenger)"
                  : "Starting capital (paper)"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26] dark:text-white">
                {startingCapital.toLocaleString("nb-NO")} kr
              </span>
            </div>
          </div>
          {/* Primær CTA — alltid synlig (lys/mørk + over tabbar) */}
          <div className="mt-6">
            <button
              type="button"
              data-testid="bot-wizard-start-inline"
              onClick={handleStart}
              disabled={loading}
              className={`${BRAND.primary} w-full font-semibold rounded-xl px-6 py-3.5 min-h-[52px] touch-manipulation transition-colors disabled:opacity-60 shadow-sm`}
            >
              {loading
                ? isNo
                  ? "Starter..."
                  : "Starting..."
                : isNo
                  ? "Start bot"
                  : "Start bot"}
            </button>
          </div>
        </div>
      )}

      {/* Navigation — Start ligger i innhold på trinn 3; her kun Tilbake/Neste */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0 left-0 right-0 px-4 py-3 md:py-4 pr-4 md:pr-20 bg-[#FAFBFC]/95 dark:bg-[#0D0F12]/95 backdrop-blur-sm border-t border-[#E2E5EC] dark:border-slate-800 z-[100] flex items-center justify-between gap-3 max-w-full">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="border border-[#E2E5EC] dark:border-slate-600 text-[#5E6478] dark:text-slate-300 rounded-xl px-5 py-3 font-semibold transition-colors hover:bg-[#F7F8FA] dark:hover:bg-slate-800 min-h-[48px] shrink-0 touch-manipulation cursor-pointer"
          >
            {isNo ? "Tilbake" : "Back"}
          </button>
        ) : (
          <span className="w-0 shrink-0" aria-hidden />
        )}
        {step < 3 ? (
          <button
            type="button"
            data-testid="bot-wizard-next"
            onClick={() => setStep(step + 1)}
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold rounded-xl px-6 py-3 transition-colors min-h-[48px] shrink-0 touch-manipulation cursor-pointer active:scale-[0.98] ml-auto"
          >
            {isNo ? "Neste" : "Next"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
