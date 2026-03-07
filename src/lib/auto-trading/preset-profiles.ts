/**
 * KLA-137: 3 brukervendte forhåndsdefinerte risikoprofiler
 *
 * Disse er BRUKER-UI-profiler som wrapper eksisterende RiskLevel-config.
 * De mappes til risk-levels.ts sine nøkler: safe, balanced, offensive.
 */

import { RISK_LEVELS, mapRiskLevelToConfig } from "./risk-levels";
import type { RiskConfig } from "./risk-manager";

export type PresetProfileId = "forsiktig" | "moderat" | "aggressiv";

export interface PresetProfile {
  id: PresetProfileId;
  name: string; // Norsk
  emoji: string;
  tagline: string; // Kort beskrivelse
  riskLevelKey: keyof typeof RISK_LEVELS;

  // KLA-137 KRAV — eksakte verdier:
  maxPositionSizePct: number; // Forsiktig: 2, Moderat: 5, Aggressiv: 10
  maxTotalExposurePct: number; // Forsiktig: 5, Moderat: 15, Aggressiv: 30
  stopLossPct: number; // Forsiktig: 3, Moderat: 5, Aggressiv: 10
  slippagePct: number; // Paper mode: alltid 0.1
  feePct: number; // Alltid 0.1 (Binance standard)

  allowedSymbols: string[]; // Forsiktig: [BTC,ETH], Moderat: top10, Aggressiv: alle
  strategies: Array<"dca" | "trend" | "grid" | "momentum">;

  // Pedagogisk tooltip (KLA-137 krav 8)
  tooltip: {
    example: string; // "Boten solgte BTC fordi RSI nådde 72"
    courseModuleSlug: string; // Link til kursmodul
    explanation: string; // Forklaring til brukeren
  };
}

export const PRESET_PROFILES: Record<PresetProfileId, PresetProfile> = {
  forsiktig: {
    id: "forsiktig",
    name: "Forsiktig",
    emoji: "🟢",
    tagline: "Trygg start — lav risiko, stabile coins",
    riskLevelKey: "safe",
    maxPositionSizePct: 2,
    maxTotalExposurePct: 5,
    stopLossPct: 3,
    slippagePct: 0.1,
    feePct: 0.1,
    allowedSymbols: ["BTCUSDT", "ETHUSDT"],
    strategies: ["dca"],
    tooltip: {
      example: "Boten kjøpte BTC for 200 kr fordi DCA-strategien trigget",
      courseModuleSlug: "dca-strategi",
      explanation:
        "DCA (Dollar Cost Averaging) kjøper jevnlig for å jevne ut prisen over tid",
    },
  },
  moderat: {
    id: "moderat",
    name: "Moderat",
    emoji: "🔵",
    tagline: "Balanse mellom vekst og sikkerhet",
    riskLevelKey: "balanced",
    maxPositionSizePct: 5,
    maxTotalExposurePct: 15,
    stopLossPct: 5,
    slippagePct: 0.1,
    feePct: 0.1,
    allowedSymbols: [
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT",
      "XRPUSDT",
      "BNBUSDT",
      "ADAUSDT",
      "DOGEUSDT",
      "AVAXUSDT",
      "MATICUSDT",
      "DOTUSDT",
    ],
    strategies: ["dca", "trend"],
    tooltip: {
      example: "Boten solgte ETH fordi RSI nådde 72 og trenden snudde",
      courseModuleSlug: "teknisk-analyse-rsi",
      explanation:
        "RSI (Relative Strength Index) måler om en coin er overkjøpt eller oversolgt",
    },
  },
  aggressiv: {
    id: "aggressiv",
    name: "Aggressiv",
    emoji: "🔴",
    tagline: "Høy risiko — høyere potensiell avkastning",
    riskLevelKey: "offensive",
    maxPositionSizePct: 10,
    maxTotalExposurePct: 30,
    stopLossPct: 10,
    slippagePct: 0.1,
    feePct: 0.1,
    allowedSymbols: [], // tom = alle par tillatt
    strategies: ["dca", "trend", "grid", "momentum"],
    tooltip: {
      example: "Boten åpnet GRID på BTC mellom 85000-90000 med 5 nivåer",
      courseModuleSlug: "grid-trading",
      explanation:
        "Grid Trading plasserer ordre over og under markedsprisen for å profitere på svingninger",
    },
  },
};

/** Hent RiskConfig for en gitt preset — brukes av bot-motor */
export function getConfigForPreset(presetId: PresetProfileId): RiskConfig {
  const profile = PRESET_PROFILES[presetId];
  const base = mapRiskLevelToConfig(profile.riskLevelKey);
  return {
    ...base,
    maxPositionSizePercent: profile.maxPositionSizePct,
    stopLossPercent: profile.stopLossPct,
    maxDailyLossPercent: profile.maxTotalExposurePct,
  };
}

/** Hent preset profile by ID */
export function getPresetProfile(presetId: PresetProfileId): PresetProfile {
  return PRESET_PROFILES[presetId];
}

/** Liste alle presets som array for UI */
export function getAllPresetProfiles(): PresetProfile[] {
  return Object.values(PRESET_PROFILES);
}

/** Sjekk om et symbol er tillatt for en gitt preset */
export function isSymbolAllowed(
  presetId: PresetProfileId,
  symbol: string,
): boolean {
  const profile = PRESET_PROFILES[presetId];
  // Tom array betyr alle symboler er tillatt
  if (profile.allowedSymbols.length === 0) return true;
  return profile.allowedSymbols.includes(symbol);
}
