/**
 * Kanonisk symbolregister for Klarpakke trading.
 *
 * Ett sted for:
 * - Symbolnormalisering (Binance-format)
 * - Kanonisk symbol-univers på tvers av paper/live
 * - Oppslag av tillatte handelspar basert på modus og risk-profil
 */

import { STRATEGY_CONFIGS } from "@/lib/trading/backtestEngine";
import { PAPER_TRADING_UI_SYMBOLS } from "@/lib/trading/paper-ui-symbols";
import { STRATEGY_UUID_CONFIGS } from "@/lib/trading/strategy-configs";

/** Et normalisert handelssymbol, f.eks. "BTCUSDT". */
export type TradingSymbol = string;

/** Støttede trading-moduser. */
export type TradingMode = "paper" | "live";

/** Minimal risk-profil kun for symbol-tillatelser. */
export interface SymbolRiskProfile {
  allowed_pairs: string[];
}

/**
 * Normaliserer ethvert symbol til Binance-format: uppercase, fjerner separatorer.
 *
 * @example "BTC/USDT" → "BTCUSDT", " btc-usdt " → "BTCUSDT"
 */
export function normalizeSymbol(input: string): TradingSymbol {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function collectPreferredPairs(): TradingSymbol[] {
  const pairs = new Set<TradingSymbol>();
  for (const config of Object.values(STRATEGY_UUID_CONFIGS)) {
    if (config.preferredPairs) {
      for (const pair of config.preferredPairs) {
        pairs.add(normalizeSymbol(pair));
      }
    }
  }
  return Array.from(pairs);
}

function collectStrategyConfigSymbols(): TradingSymbol[] {
  const symbols = new Set<TradingSymbol>();
  for (const config of Object.values(STRATEGY_CONFIGS)) {
    if (config.symbol) {
      symbols.add(normalizeSymbol(config.symbol));
    }
  }
  return Array.from(symbols);
}

/**
 * Kanonisk symbol-univers brukt av både paper og live.
 *
 * Slår sammen:
 * - Paper trading UI-symboler
 * - Strategi-UUID prefererte par
 * - Backtest-strategikonfigurasjoners symboler
 */
export function getCanonicalSymbolUniverse(): readonly TradingSymbol[] {
  const universe = new Set<TradingSymbol>([
    ...PAPER_TRADING_UI_SYMBOLS.map(normalizeSymbol),
    ...collectPreferredPairs(),
    ...collectStrategyConfigSymbols(),
  ]);
  return Object.freeze(Array.from(universe).sort());
}

/**
 * Returnerer tillatte handelspar for en gitt modus og optional risk-profil.
 *
 * Paper: union av kanonisk univers og profilens allowed_pairs (hvis gitt).
 * Live:  profilens allowed_pairs, eller kanonisk univers som fallback.
 */
export function getAllowedPairs(
  mode: TradingMode,
  profile?: SymbolRiskProfile,
): TradingSymbol[] {
  const canonical = getCanonicalSymbolUniverse();
  if (mode === "paper") {
    const fromProfile = profile?.allowed_pairs ?? [];
    return Array.from(
      new Set([...canonical, ...fromProfile.map(normalizeSymbol)]),
    ).sort();
  }
  // Live: kun profilens tillatte par, fallback til kanonisk univers
  if (profile?.allowed_pairs) {
    return Array.from(new Set(profile.allowed_pairs.map(normalizeSymbol))).sort();
  }
  return [...canonical];
}

/** Sjekker om et symbol er i det kanoniske universet. */
export function isCanonicalSymbol(symbol: string): boolean {
  return getCanonicalSymbolUniverse().includes(normalizeSymbol(symbol));
}
