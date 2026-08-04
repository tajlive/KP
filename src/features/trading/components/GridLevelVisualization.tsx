"use client";

/**
 * GridLevelVisualization — viser grid-nivåene for nybegynnere.
 *
 * Visuell forklaring: horisontale linjer = kjøp/salg-nivåer.
 * Nåværende pris markert. Ingen fagbegreper — kun farger og piler.
 */

interface GridLevelVisualizationProps {
  lowerPrice: number;
  upperPrice: number;
  currentPrice: number;
  gridLevels: number;
  formatNOK: (v: number) => string;
  locale?: "no" | "en";
}

export function GridLevelVisualization({
  lowerPrice,
  upperPrice,
  currentPrice,
  gridLevels,
  formatNOK,
  locale = "no",
}: GridLevelVisualizationProps) {
  const t = locale === "en"
    ? {
        title: "Your price levels",
        buy: "Buy here (price falls)",
        sell: "Sell here (price rises)",
        now: "Current price",
        range: "Range",
      }
    : {
        title: "Dine prisnivåer",
        buy: "Kjøper her (pris faller)",
        sell: "Selger her (pris stiger)",
        now: "Nåværende pris",
        range: "Intervall",
      };

  // Beregn posisjon (0-100%) for hvert nivå
  const range = upperPrice - lowerPrice;
  const currentPct = range > 0 ? ((currentPrice - lowerPrice) / range) * 100 : 50;
  const clampedCurrent = Math.max(0, Math.min(100, currentPct));

  // Generer nivåer (vis maks 8 for lesbarhet)
  const visibleLevels = Math.min(gridLevels, 8);
  const step = range / (visibleLevels - 1);
  const levels = Array.from({ length: visibleLevels }, (_, i) => ({
    price: lowerPrice + i * step,
    pct: (i / (visibleLevels - 1)) * 100,
    isBuy: i < visibleLevels / 2,
  }));

  return (
    <div className="bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">{t.title}</h3>

      {/* Pris-range-visning */}
      <div className="relative h-32 mb-4">
        {/* Bakgrunn: kjøp-sone (nederst) / salg-sone (øverst) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-emerald-500/10 rounded-b-lg" />
        <div className="absolute inset-x-0 top-0 h-1/2 bg-red-500/10 rounded-t-lg" />

        {/* Nivå-linjer */}
        {levels.map((level, i) => (
          <div
            key={i}
            className={`absolute inset-x-0 border-t border-dashed ${
              level.isBuy ? "border-emerald-500/40" : "border-red-500/40"
            }`}
            style={{ bottom: `${level.pct}%` }}
          >
            <span
              className={`absolute right-1 -top-2 text-[10px] font-mono ${
                level.isBuy ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatNOK(level.price)}
            </span>
          </div>
        ))}

        {/* Nåværende pris-markør */}
        <div
          className="absolute inset-x-0 border-t-2 border-amber-400 z-10"
          style={{ bottom: `${clampedCurrent}%` }}
        >
          <div className="absolute left-1 -top-3 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-amber-400">
              {t.now}: {formatNOK(currentPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Forklaring */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-emerald-400 rounded" />
          <span className="text-slate-300">{t.buy}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-400 rounded" />
          <span className="text-slate-300">{t.sell}</span>
        </div>
        <div className="text-slate-500 text-[10px] mt-2">
          {t.range}: {formatNOK(lowerPrice)} — {formatNOK(upperPrice)} · {gridLevels} {locale === "en" ? "levels" : "nivåer"}
        </div>
      </div>
    </div>
  );
}
