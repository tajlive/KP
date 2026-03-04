/**
 * Signal Generator for Trading Strategies
 * Ported from LiveStrategyView.tsx
 */

import {
  calculateBollingerBands,
  calculateMACD,
  calculateRSI,
  calculateSMA,
} from "./indicators";

export interface Signal {
  action: "BUY" | "SELL" | "HOLD";
  reason: string;
}

export function generateSignal(strategyType: string, prices: number[]): Signal {
  const len = prices.length;
  if (len < 30) {
    return { action: "HOLD", reason: "Venter på nok data for analyse..." };
  }

  const lastPrice = prices[len - 1];

  switch (strategyType) {
    case "dca_trygg": {
      // DCA buys every ~20 ticks (controlled by component/worker)
      return {
        action: "BUY",
        reason: "DCA kjøper automatisk for å utjevne prissvingninger",
      };
    }
    case "trend_balansert": {
      const sma10 = calculateSMA(prices, 10);
      const sma30 = calculateSMA(prices, 30);
      const curr10 = sma10[len - 1];
      const prev10 = sma10[len - 2];
      const curr30 = sma30[len - 1];
      const prev30 = sma30[len - 2];

      if (
        curr10 === null ||
        curr30 === null ||
        prev10 === null ||
        prev30 === null
      ) {
        return { action: "HOLD", reason: "Bygger opp SMA-buffere..." };
      }

      if (prev10 <= prev30 && curr10 > curr30) {
        return {
          action: "BUY",
          reason: `SMA(10) krysset over SMA(30) — bullish trend bekreftet`,
        };
      }
      if (prev10 >= prev30 && curr10 < curr30) {
        return {
          action: "SELL",
          reason: `SMA(10) krysset under SMA(30) — bearish signal`,
        };
      }
      return {
        action: "HOLD",
        reason: `Venter på MA-crossover. SMA(10): ${Math.round(
          curr10,
        ).toLocaleString("no")} / SMA(30): ${Math.round(curr30).toLocaleString(
          "no",
        )}`,
      };
    }
    case "multisignal_aktiv": {
      const rsi = calculateRSI(prices);
      const macd = calculateMACD(prices);
      const currentRSI = rsi[len - 1];
      const currentHist = macd.histogram[len - 1];
      const prevHist = macd.histogram[len - 2];

      if (currentRSI === null) {
        return { action: "HOLD", reason: "Bygger opp RSI-buffer..." };
      }
      if (currentRSI < 30 && prevHist < 0 && currentHist > 0) {
        return {
          action: "BUY",
          reason: `RSI falt under 30 (${currentRSI.toFixed(
            0,
          )}, oversolgt) OG MACD-histogrammet snudde positivt`,
        };
      }
      if (currentRSI > 70 && prevHist > 0 && currentHist < 0) {
        return {
          action: "SELL",
          reason: `RSI over 70 (${currentRSI.toFixed(
            0,
          )}, overkjøpt) OG MACD-histogrammet snudde negativt`,
        };
      }
      if (currentRSI < 30) {
        return {
          action: "HOLD",
          reason: `RSI er lav (${currentRSI.toFixed(
            0,
          )}) men MACD har ikke bekreftet ennå`,
        };
      }
      if (currentRSI > 70) {
        return {
          action: "HOLD",
          reason: `RSI er høy (${currentRSI.toFixed(
            0,
          )}) men MACD har ikke bekreftet ennå`,
        };
      }
      return {
        action: "HOLD",
        reason: `RSI: ${currentRSI.toFixed(0)} — nøytral sone, venter på signal`,
      };
    }
    case "grid_bot": {
      const gridSpacing = lastPrice * 0.01; // 1% grid
      const gridLevel = Math.round(lastPrice / gridSpacing) * gridSpacing;
      const diff = lastPrice - gridLevel;
      if (diff < -gridSpacing * 0.4) {
        return {
          action: "BUY",
          reason: `Prisen traff nedre gridnivå på ${Math.round(
            gridLevel - gridSpacing,
          ).toLocaleString("no")} kr — kjøper i henhold til grid`,
        };
      }
      if (diff > gridSpacing * 0.4) {
        return {
          action: "SELL",
          reason: `Prisen traff øvre gridnivå på ${Math.round(
            gridLevel + gridSpacing,
          ).toLocaleString("no")} kr — selger i henhold til grid`,
        };
      }
      return {
        action: "HOLD",
        reason: `Mellom gridnivåer. Neste kjøp: ${Math.round(
          gridLevel - gridSpacing,
        ).toLocaleString("no")} kr, neste salg: ${Math.round(
          gridLevel + gridSpacing,
        ).toLocaleString("no")} kr`,
      };
    }
    case "ai_copy": {
      const bb = calculateBollingerBands(prices);
      const lastBB = bb[len - 1];
      if (!lastBB.upper || !lastBB.lower) {
        return { action: "HOLD", reason: "Bygger opp Bollinger-buffere..." };
      }
      if (lastPrice > lastBB.upper) {
        return {
          action: "BUY",
          reason: `Prisen brøt ut over Bollinger-båndet (${Math.round(
            lastBB.upper,
          ).toLocaleString("no")} kr) — sterk momentum-signal`,
        };
      }
      if (lastPrice < lastBB.lower) {
        return {
          action: "SELL",
          reason: `Prisen falt under Bollinger-båndet (${Math.round(
            lastBB.lower,
          ).toLocaleString("no")} kr) — negativ momentum`,
        };
      }
      return {
        action: "HOLD",
        reason: `Prisen er innenfor Bollinger-båndet (${Math.round(
          lastBB.lower,
        ).toLocaleString("no")} — ${Math.round(lastBB.upper).toLocaleString(
          "no",
        )} kr)`,
      };
    }
    default:
      return { action: "HOLD", reason: "Ukjent strategi" };
  }
}
