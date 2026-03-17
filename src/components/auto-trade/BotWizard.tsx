"use client";

import { useState } from "react";
import { Lock, CheckCircle2 } from "lucide-react";

interface BotWizardProps {
  userId: string;
  locale: string;
  tier: string;
}

const TIER_ORDER = ["student", "bachelor", "master", "phd"];

const TIER_COIN_LIMIT: Record<string, number> = {
  student: 3,
  bachelor: 5,
  master: 10,
  phd: 10,
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
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

export function BotWizard({ userId, locale, tier }: BotWizardProps) {
  const [step, setStep] = useState(1);
  const [strategy, setStrategy] = useState("dca");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["BTCUSDT"]);
  const [loading, setLoading] = useState(false);

  const isNo = locale === "no";
  const coinLimit = TIER_COIN_LIMIT[tier] ?? 3;

  const STRATEGIES = [
    {
      id: "dca",
      name: "DCA",
      description: isNo
        ? "Dollar Cost Averaging — kjøp automatisk til fast tid"
        : "Dollar Cost Averaging — buy automatically on schedule",
      icon: "📊",
      tier: "student",
      recommended: true,
    },
    {
      id: "trend",
      name: "Trend Following",
      description: isNo
        ? "Følg markedstrenden med teknisk analyse"
        : "Follow market trends with technical analysis",
      icon: "📈",
      tier: "bachelor",
    },
    {
      id: "grid",
      name: "Grid Trading",
      description: isNo
        ? "Kjøp lavt, selg høyt i et prisbånd"
        : "Buy low, sell high within a price range",
      icon: "🔲",
      tier: "bachelor",
    },
    {
      id: "multi",
      name: "Multi-Signal",
      description: isNo
        ? "Kombiner flere indikatorer for signaler"
        : "Combine multiple indicators for signals",
      icon: "🎯",
      tier: "master",
    },
    {
      id: "ai-copy",
      name: "AI Copy Trading",
      description: isNo
        ? "Kopier topphandlernes strategier med AI"
        : "Copy top traders with AI",
      icon: "🤖",
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/${locale}/dashboard`;
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const stepLabels = [
    isNo ? "Strategi" : "Strategy",
    isNo ? "Innstillinger" : "Settings",
    isNo ? "Start" : "Start",
  ];

  const selectedStrategy = STRATEGIES.find((s) => s.id === strategy);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1A1D26] mb-8">
        {isNo ? "Start trading-bot" : "Start trading bot"}
      </h1>

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
                  className="w-16 h-0.5 sm:w-24"
                  style={{
                    backgroundColor: isPast ? "#22C55E" : "#E2E5EC",
                  }}
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
                  {isPast ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: isActive ? "#0052FF" : isPast ? "#22C55E" : "#B4BFCE",
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
        <div>
          <h2 className="text-lg font-semibold text-[#1A1D26] mb-4">
            {isNo ? "Velg strategi" : "Choose strategy"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {STRATEGIES.map((s) => {
              const locked = !tierMeetsRequirement(tier, s.tier);
              const selected = strategy === s.id && !locked;

              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setStrategy(s.id)}
                  className={`relative text-left bg-white rounded-xl p-5 transition-all ${
                    locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    selected
                      ? "ring-2 ring-[#0052FF] border border-[#0052FF]"
                      : "border border-[#E2E5EC] hover:border-[#B4BFCE]"
                  } shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}
                >
                  {s.recommended && (
                    <span className="absolute top-3 right-3 bg-[#DCFCE7] text-[#16A34A] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {isNo ? "Anbefalt" : "Recommended"}
                    </span>
                  )}
                  {locked && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 text-[#9CA3AF] text-[10px] font-medium">
                      <Lock className="w-3 h-3" />
                      {isNo ? "Krever" : "Requires"}{" "}
                      {s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}
                    </span>
                  )}
                  <span className="text-3xl block mb-3">{s.icon}</span>
                  <span className="text-sm font-bold text-[#1A1D26] block mb-1">
                    {s.name}
                  </span>
                  <span className="text-xs text-[#5E6478] leading-relaxed block">
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
            <h2 className="text-lg font-semibold text-[#1A1D26] mb-4">
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
                    className={`w-full text-left bg-white rounded-xl p-4 transition-all flex items-center gap-4 ${
                      selected
                        ? "ring-2 ring-[#0052FF] border border-[#0052FF]"
                        : "border border-[#E2E5EC] hover:border-[#B4BFCE]"
                    } shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}
                    style={{ borderLeft: `4px solid ${r.color}` }}
                  >
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-[#1A1D26] block">
                        {r.label}
                      </span>
                      <span className="text-xs text-[#5E6478]">
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
            <h2 className="text-lg font-semibold text-[#1A1D26] mb-1">
              {isNo ? "Velg kryptovaluta" : "Select coins"}
            </h2>
            <p className="text-xs text-[#5E6478] mb-4">
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
                        ? "bg-[#0052FF] text-white"
                        : "bg-[#F1F3F9] text-[#5E6478] hover:bg-[#E2E5EC]"
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
          <h2 className="text-lg font-semibold text-[#1A1D26] mb-4">
            {isNo ? "Oppsummering" : "Summary"}
          </h2>
          <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478]">
                {isNo ? "Strategi" : "Strategy"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26]">
                {selectedStrategy?.icon} {selectedStrategy?.name}
              </span>
            </div>
            <div className="h-px bg-[#E2E5EC]" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478]">
                {isNo ? "Risikonivå" : "Risk level"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26] capitalize">
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
            <div className="h-px bg-[#E2E5EC]" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478]">
                {isNo ? "Valutaer" : "Coins"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26]">
                {selectedPairs.map((p) => p.replace("USDT", "")).join(", ")}
              </span>
            </div>
            <div className="h-px bg-[#E2E5EC]" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#5E6478]">
                {isNo ? "Lekepenger brukt" : "Paper money used"}
              </span>
              <span className="text-sm font-semibold text-[#1A1D26]">
                kr 100 000
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 gap-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="border border-[#E2E5EC] text-[#5E6478] hover:bg-[#F7F8FA] rounded-xl px-6 py-3 font-semibold transition-colors"
          >
            {isNo ? "Tilbake" : "Back"}
          </button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold rounded-xl px-6 py-3 transition-colors"
          >
            {isNo ? "Neste" : "Next"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-semibold rounded-xl px-6 py-3 w-full transition-colors disabled:opacity-60"
          >
            {loading
              ? isNo
                ? "Starter..."
                : "Starting..."
              : isNo
                ? "Start bot"
                : "Start bot"}
          </button>
        )}
      </div>
    </div>
  );
}
