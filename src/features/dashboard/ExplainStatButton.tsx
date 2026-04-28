"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";
import { HelpCircle, X } from "lucide-react";

export type StatType = "winRate" | "totalReturn" | "balance" | "sharpe" | "drawdown" | "pnl";

interface ExplainStatButtonProps {
  statType: StatType;
  value?: number;
  context?: {
    totalTrades?: number;
    avgTradeSize?: number;
    industryAvg?: number;
  };
}

interface Explanation {
  title: string;
  short: string;
  detailed: string;
  benchmark: string;
  action: string;
}

function getExplanation(statType: StatType, value: number | undefined, isNo: boolean, context?: ExplainStatButtonProps["context"]): Explanation {
  const t = isNo;

  switch (statType) {
    case "winRate": {
      const v = value ?? 0;
      return {
        title: t ? "Win Rate" : "Win Rate",
        short: t
          ? "Andel trades som endte med profitt."
          : "Percentage of trades that ended in profit.",
        detailed: t
          ? `Din win rate på ${v}% betyr at ${v} av 100 trades er profitable. En win rate over 50% er positiv, men det som virkelig betyr noe er forholdet mellom gjennomsnittlig gevinst og gjennomsnittlig tap (risk/reward).`
          : `Your win rate of ${v}% means ${v} out of 100 trades are profitable. A win rate above 50% is positive, but what really matters is the ratio between average gain and average loss (risk/reward).`,
        benchmark: t
          ? "Bransjesnitt: 45-55% for day tradere. Profesjonelle ofte 50-60%."
          : "Industry average: 45-55% for day traders. Professionals often 50-60%.",
        action:
          v < 45
            ? t
              ? "Gjennomgå tapende trades for å finne felles mønstre."
              : "Review losing trades to find common patterns."
            : t
              ? "Bra! Fokuser nå på å maksimere gevinstene og minimere tapene."
              : "Good! Now focus on maximizing wins and minimizing losses.",
      };
    }
    case "totalReturn": {
      const v = value ?? 0;
      return {
        title: t ? "Total avkastning" : "Total Return",
        short: t
          ? "Kumulativ profitt eller tap siden start."
          : "Cumulative profit or loss since start.",
        detailed: t
          ? `Din totale avkastning på ${v.toLocaleString()} NOK reflekterer summen av alle realiserte gevinster og tap. Dette inkluderer ikke åpne posisjoner.`
          : `Your total return of ${v.toLocaleString()} NOK reflects the sum of all realized gains and losses. This does not include open positions.`,
        benchmark: t
          ? "Mål: Overgå indeks (f.eks. S&P 500 ~10% årlig)."
          : "Goal: Outperform index (e.g., S&P 500 ~10% annually).",
        action:
          v < 0
            ? t
              ? "Vurder å redusere posisjonsstørrelse og fokusere på setup-kvalitet."
              : "Consider reducing position size and focusing on setup quality."
            : t
              ? "Vurder gradvis å øke kapitalen din."
              : "Consider gradually increasing your capital.",
      };
    }
    case "balance": {
      const v = value ?? 0;
      return {
        title: t ? "Kontobalanse" : "Account Balance",
        short: t
          ? "Tilgjengelig kapital for trading."
          : "Available capital for trading.",
        detailed: t
          ? `Din kontobalanse på ${v.toLocaleString()} NOK er kapitalen du har tilgjengelig for nye trades. Hold alltid minst 30% i cash som buffer mot drawdown.`
          : `Your account balance of ${v.toLocaleString()} NOK is the capital available for new trades. Always keep at least 30% in cash as a buffer against drawdown.`,
        benchmark: t
          ? "Regel: Risiker aldri mer enn 1-2% av total kapital per trade."
          : "Rule: Never risk more than 1-2% of total capital per trade.",
        action: t
          ? "Sjekk at du ikke er overeksponert."
          : "Check that you are not overexposed.",
      };
    }
    case "drawdown": {
      const v = value ?? 0;
      return {
        title: t ? "Drawdown" : "Drawdown",
        short: t
          ? "Nedgang fra topp til bunn i equity curve."
          : "Decline from peak to trough in equity curve.",
        detailed: t
          ? `Din max drawdown på ${v.toFixed(1)}% betyr at porteføljen din falt ${v.toFixed(1)}% fra sin høyeste verdi. Dette er en nøkkelindikator for risk management. `
          : `Your max drawdown of ${v.toFixed(1)}% means your portfolio fell ${v.toFixed(1)}% from its highest value. This is a key risk management indicator.`,
        benchmark: t
          ? "Akseptabelt: <15% for konservative, <25% for aggressive."
          : "Acceptable: <15% for conservative, <25% for aggressive.",
        action:
          v > 20
            ? t
              ? "KRITISK: Reduser posisjonsstørrelse umiddelbart."
              : "CRITICAL: Reduce position size immediately."
            : t
              ? "Innen akseptable grenser. Fortsett å overvåke."
              : "Within acceptable limits. Keep monitoring.",
      };
    }
    case "sharpe": {
      const v = value ?? 0;
      return {
        title: t ? "Sharpe Ratio" : "Sharpe Ratio",
        short: t
          ? "Risikojustert avkastning — hvor mye profitt per enhet risk."
          : "Risk-adjusted return — how much profit per unit of risk.",
        detailed: t
          ? `Sharpe ratio på ${v.toFixed(2)} indikerer din risikojusterte avkastning. Over 1.0 er godt, over 2.0 er svært godt.`
          : `A Sharpe ratio of ${v.toFixed(2)} indicates your risk-adjusted return. Above 1.0 is good, above 2.0 is excellent.`,
        benchmark: t
          ? "Godt: >1.0 | Svært godt: >2.0 | Fantastisk: >3.0"
          : "Good: >1.0 | Very good: >2.0 | Excellent: >3.0",
        action: v >= 1
          ? t ? "Sterkt! Fortsett din nåværende strategi." : "Strong! Keep your current strategy."
          : t ? "Vurder å redusere volatilitet eller øke konsistente gevinster." : "Consider reducing volatility or increasing consistent gains.",
      };
    }
    case "pnl": {
      const v = value ?? 0;
      return {
        title: t ? "P&L (Profit & Loss)" : "P&L (Profit & Loss)",
        short: t
          ? "Gevinst eller tap på en trade eller periode."
          : "Profit or loss on a trade or period.",
        detailed: t
          ? `P&L på ${v.toLocaleString()} NOK er summen av alle gevinster minus alle tap i perioden. Positiv P&L = profittabel trading. `
          : `P&L of ${v.toLocaleString()} NOK is the sum of all gains minus all losses in the period. Positive P&L = profitable trading.`,
        benchmark: t
          ? "Mål: Konsistent positiv P&L over tid, ikke store svingninger."
          : "Goal: Consistently positive P&L over time, not large swings.",
        action:
          v < 0
            ? t
              ? "Analyser om tapene kommer fra ett spesifikt pair eller time."
              : "Analyze if losses come from one specific pair or time."
            : t
              ? "Bra! Dokumenter hva som fungerte."
              : "Good! Document what worked.",
      };
    }
    default:
      return {
        title: statType,
        short: "",
        detailed: "",
        benchmark: "",
        action: "",
      };
  }
}

export function ExplainStatButton({ statType, value, context }: ExplainStatButtonProps) {
  const locale = useLocale();
  const isNo = locale === "no";
  const [open, setOpen] = useState(false);
  const explanation = getExplanation(statType, value, isNo, context);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-400 transition-colors"
        aria-label={isNo ? `Forklar ${explanation.title}` : `Explain ${explanation.title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isNo ? "Hva betyr dette?" : "What is this?"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              role="button"
              tabIndex={0}
              aria-label="Lukk"
              onClick={() => setOpen(false)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{explanation.title}</h4>
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-3">{explanation.short}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                {explanation.detailed}
              </p>

              <div className="p-2.5 bg-slate-800 rounded-lg mb-3">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                  {isNo ? "Benchmark" : "Benchmark"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{explanation.benchmark}</p>
              </div>

              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-0.5">
                  {isNo ? "Anbefaling" : "Recommendation"}
                </p>
                <p className="text-xs text-blue-200">{explanation.action}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExplainStatButton;
