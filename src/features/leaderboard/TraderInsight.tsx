"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/paper-trading";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TraderConfig {
  /** Risikonivå (auto_low / low / standard / high / extreme) */
  risk_level: string;
  /** Standard stop-loss i prosent (f.eks. 2.5 for 2.5 %) */
  stop_loss_pct: number;
  /** Standard take-profit i prosent (f.eks. 5 for 5 %) */
  take_profit_pct: number;
  /** ATR-multiplikator for stop-loss */
  atr_mult: number;
  /** Maks antall samtidige posisjoner */
  max_positions: number;
  /** Maks tillatt drawdown før stopp */
  max_drawdown_pct: number;
  /** Bruker trailing stop? */
  trailing_stop: boolean;
  /** Aktiv strategi */
  strategy?: string;
}

// ─── Insight interface ──────────────────────────────────────────────────────

export interface TraderInsight {
  /** Hovedforklaring — ett avsnitt på norsk */
  explanation: string;
  /** Grønt tips som traderen kan handle på */
  tip: string;
  /** Kort etikett for kategorisering (f.eks. "Måneskudd", "Risikostyring", "Balansert") */
  label: string;
}

// ─── generateInsight ────────────────────────────────────────────────────────

const RISK_LABELS: Record<string, string> = {
  auto_low: "Auto-Lav",
  low: "Lav",
  standard: "Standard",
  high: "Høy",
  extreme: "Ekstrem",
};

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} %`;
}

/**
 * Genererer AI-innsikt basert på en leaderboard-entry og traderens konfigurasjon.
 *
 * Logikk:
 * - return_pct > 100 → RSI-indikator + take-profit strategi (måneskudd)
 * - return_pct < 0   → stop-loss problem (risikostyring)
 * - ellers           → balansert strategi
 */
export function generateInsight(
  entry: Pick<LeaderboardEntry, "return_pct" | "win_rate" | "total_trades" | "risk_level" | "sharpe_ratio">,
  config: TraderConfig,
): TraderInsight {
  const { return_pct, win_rate, total_trades, sharpe_ratio } = entry;

  if (return_pct > 100) {
    return {
      label: "🚀 Måneskudd",
      explanation: [
        `En avkastning på **${formatPct(return_pct)}** er eksepsjonell og tyder på at traderen`,
        `har fanget en sterk trend med god timing. Slike resultater oppstår ofte når`,
        `**RSI-indikatoren** (Relative Strength Index) har signalisert overkjøpt/kjøpt-soner`,
        `og traderen har kombinert dette med en aggressiv **take-profit strategi**`,
        `(${config.take_profit_pct} % TP). Med ${win_rate.toFixed(0)} % vinnrate`,
        `og ${total_trades} handler, indikerer dette en systematisk — ikke tilfeldig —`,
        `tilnærming. ${sharpe_ratio > 1 ? `Sharpe-ratio på ${sharpe_ratio.toFixed(2)} bekrefter god risikojustert avkastning.` : ""}`,
      ].join(" "),
      tip: `Fortsett å følge trenden, men vær oppmerksom på RSI-overkjøpt-soner. Vurder å flytte stop-loss for å låse inn gevinster.`,
    };
  }

  if (return_pct < 0) {
    return {
      label: "⚠️ Risikostyring",
      explanation: [
        `En negativ avkastning på **${formatPct(return_pct)}** viser at strategien har`,
        `slitt i gjeldende markedsforhold. Med stop-loss satt til ${config.stop_loss_pct} %`,
        `og ATR-multiplikator på ${config.atr_mult}x, kan tapsrekken skyldes for`,
        `**trange stopp** som blir slått ut av markedets naturlige støy, eller at`,
        `maks-drawdown-grensen på ${config.max_drawdown_pct} % er nådd.`,
        `${total_trades < 20 ? `Med kun ${total_trades} handler er utvalget lite —` : `Med ${total_trades} handler er det`}`,
        `viktig å skille mellom dårlig flaks og et systematisk **stop-loss problem**.`,
        `${config.trailing_stop ? "Trailing stop er aktivert, noe som kan forverre hyppige stopp i volatilside marked." : "Trailing stop er ikke aktivert — vurder å slå det på for å unngå unødvendige tap."}`,
      ].join(" "),
      tip: `Gjennomgå stop-loss-nivåene: vurder bredere stopp (høyere ATR-mult) eller reduser posisjonsstørrelse (${config.max_positions} maks). Lavere risiko (${RISK_LABELS[config.risk_level] ?? config.risk_level}) kan redusere hyppigheten av tap.`,
    };
  }

  // Balansert strategi
  return {
    label: "⚖️ Balansert",
    explanation: [
      `Med **${formatPct(return_pct)}** avkastning ligger traderen i et sunt spenn.`,
      `Vinnraten på ${win_rate.toFixed(0)} % over ${total_trades} handler tyder på`,
      `en **balansert strategi** hvor risiko og belønning holder seg innenfor`,
      `forventede rammer. Stop-loss på ${config.stop_loss_pct} % og take-profit på`,
      `${config.take_profit_pct} % gir et fornuftig risk/reward-forhold`,
      `(${(config.take_profit_pct / config.stop_loss_pct).toFixed(1)}:1).`,
      `${sharpe_ratio > 0 ? `Sharpe-ratio ${sharpe_ratio.toFixed(2)} indikerer positiv risikojustert avkastning.` : "Sharpe-ratio er lav — vurder å justere risk/reward-forholdet."}`,
    ].join(" "),
    tip: `Hold kursen. Optimaliser ved å justere take-profit/${config.take_profit_pct > config.stop_loss_pct * 2 ? "stop-loss-forholdet ytterligere" : "risikonivået — et høyere risk/reward-forhold kan øke avkastningen"}.`,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TraderInsightProps {
  /** Leaderboard-entry for traderen det vises innsikt om */
  entry: LeaderboardEntry;
  /** Traderens konfigurasjon */
  traderConfig: TraderConfig;
  className?: string;
}

/**
 * Viser AI-generert innsikt og anbefalinger for en trader.
 *
 * En blå boks med 🧠 AI-analyse header, strategisk forklaring
 * og et grønt tips nederst.
 */
export function TraderInsightCard({
  entry,
  traderConfig,
  className,
}: TraderInsightProps) {
  const insight = generateInsight(entry, traderConfig);

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-100 bg-blue-50 p-4",
        "dark:border-blue-800 dark:bg-blue-950/40",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg" role="img" aria-label="AI">
          🧠
        </span>
        <span className="font-semibold text-blue-800 dark:text-blue-200">
          AI-analyse
        </span>
        <span className="ml-auto rounded-full bg-blue-200/60 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-800/60 dark:text-blue-300">
          {insight.label}
        </span>
      </div>

      {/* Forklaring */}
      <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {insight.explanation}
      </p>

      {/* Grønt tips */}
      <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
        <span className="mt-0.5 shrink-0 text-base" role="img" aria-label="Tips">
          💡
        </span>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {insight.tip}
        </p>
      </div>
    </div>
  );
}
