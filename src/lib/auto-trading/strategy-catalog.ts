/**
 * Produktstrategi-katalog — én kilde for UI-standarder, paper-kort, builder
 * og berikelse av `strategy_config` ved session-start (synk med tick + RISK_LEVELS).
 *
 * Se også: `docs/trading/AUTO-TRADE-STRATEGY-RESEARCH.md`, `strategy-id-aliases.ts`.
 */

import { RISK_LEVELS, type RiskLevelKey } from "@/lib/auto-trading/risk-levels";
import {
  OPTIMIZED_PROFILES,
  type RiskLevel as OptProfileName,
} from "@/lib/config/optimized-risk-profiles";
import type { ProductStrategyId } from "@/lib/trading/strategy-id-aliases";
import { DCA_CONSTRAINTS } from "@/lib/trading/dca-validation";

/** UI / tick produkt-ID → nøkkel i RISK_LEVELS (partial TP, trailing, …) */
const STRATEGY_TO_RISK_KEY: Record<ProductStrategyId, RiskLevelKey> = {
  dca_trygg: "safe",
  trend_balansert: "balanced",
  multisignal_aktiv: "offensive",
  simple_grid: "balanced",
  grid_bot: "balanced",
  ensemble_ai: "balanced",
  ai_copy: "aggressive",
};

/** Produkt-ID → optimalisert profil (Kelly, intervall, SL/TP-tall) */
const STRATEGY_TO_OPT_PROFILE: Record<ProductStrategyId, OptProfileName> = {
  dca_trygg: "conservative",
  trend_balansert: "moderate",
  multisignal_aktiv: "aggressive",
  simple_grid: "moderate",
  grid_bot: "moderate",
  ensemble_ai: "moderate",
  ai_copy: "dynamic",
};

export const STRATEGY_UI_ORDER: ProductStrategyId[] = [
  "simple_grid",
  "dca_trygg",
  "trend_balansert",
  "multisignal_aktiv",
  "grid_bot",
  "ensemble_ai",
  "ai_copy",
];

const LEGACY_STRATEGY_ID_TO_PRODUCT: Record<string, ProductStrategyId> = {
  dca: "dca_trygg",
  trend_follow: "trend_balansert",
  multi_signal: "multisignal_aktiv",
  grid: "grid_bot",
};

/** API / DB kan fortsatt sende korte motor-ID-er — mappes til produkt-ID */
export function resolveProductStrategyId(raw: unknown): ProductStrategyId {
  const s = String(raw ?? "dca_trygg");
  if (STRATEGY_UI_ORDER.includes(s as ProductStrategyId)) {
    return s as ProductStrategyId;
  }
  return LEGACY_STRATEGY_ID_TO_PRODUCT[s] ?? "dca_trygg";
}

/** Samme rekkefølge og risiko-skala (1–5) som tidligere UnifiedTradingDashboard */
export const STRATEGY_DEFS_FOR_DASHBOARD: {
  type: ProductStrategyId;
  risk: number;
}[] = [
  { type: "dca_trygg", risk: 1 },
  { type: "trend_balansert", risk: 3 },
  { type: "multisignal_aktiv", risk: 4 },
  { type: "grid_bot", risk: 3 },
  { type: "ensemble_ai", risk: 3 },
  { type: "ai_copy", risk: 5 },
];

function optProfile(id: ProductStrategyId) {
  return OPTIMIZED_PROFILES[STRATEGY_TO_OPT_PROFILE[id]];
}

/** Postgres enum på trading_sessions.risk_level */
export function getDbRiskLevelEnum(
  id: ProductStrategyId,
): "conservative" | "balanced" | "aggressive" {
  const k = STRATEGY_TO_RISK_KEY[id];
  if (k === "safe") return "conservative";
  if (k === "balanced") return "balanced";
  return "aggressive";
}

export function getRiskLevelKeyForStrategy(
  id: ProductStrategyId,
): RiskLevelKey {
  return STRATEGY_TO_RISK_KEY[id] ?? "balanced";
}

/** Normaliserer BTCUSDT, BTC/USDT, btc / usdt → BTC/USDT */
export function normalizeTradingPairSymbol(
  input: string | undefined | null,
): string {
  if (!input || typeof input !== "string") return "BTC/USDT";
  const t = input.trim().toUpperCase().replace(/\s+/g, "");
  if (t.includes("/")) {
    const [a, b] = t.split("/");
    if (a && b) return `${a}/${b}`;
  }
  if (t.endsWith("USDT") && t.length > 4) {
    return `${t.slice(0, -4)}/USDT`;
  }
  return "BTC/USDT";
}

export function parseInitialCapitalFromConfig(
  config: Record<string, unknown>,
  fallback = 100_000,
): number {
  const candidates = [
    config.initial_capital,
    config.paper_capital,
    config.capital_nok,
    config.capital,
    config.current_capital,
  ];
  for (const c of candidates) {
    const n = typeof c === "string" ? parseFloat(c) : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

export function parseTradingPairFromConfig(
  strategyType: ProductStrategyId,
  config: Record<string, unknown>,
): string {
  const raw =
    (config.trading_pair as string) ||
    (config.symbol as string) ||
    (config.tradingPair as string);
  if (raw) return normalizeTradingPairSymbol(raw);
  return normalizeTradingPairSymbol(getDefaultTradingPair(strategyType));
}

export function getDefaultTradingPair(
  _strategyType: ProductStrategyId,
): string {
  return "BTC/USDT";
}

/**
 * Slår sammen brukerens config med trailing/partial TP fra RISK_LEVELS
 * og strategi-spesifikke tick-felt (DCA-intervall, grid-nøkkelalias).
 */
export function enrichStrategyConfigForSession(
  strategyType: ProductStrategyId,
  userConfig: Record<string, unknown>,
): Record<string, unknown> {
  const key = STRATEGY_TO_RISK_KEY[strategyType];
  const rl = RISK_LEVELS[key];
  const opt = optProfile(strategyType);

  const base: { [key: string]: unknown } = {
    ...userConfig,
    risk_level_key: key,
    trailing_stop_pct: userConfig.trailing_stop_pct ?? rl.trailing_stop_pct,
    partial_tp_levels: userConfig.partial_tp_levels ?? [
      ...rl.partial_tp_levels,
    ],
  };

  if (strategyType === "dca_trygg") {
    base.interval_minutes =
      userConfig.interval_minutes ?? DCA_CONSTRAINTS.defaultIntervalMinutes;
    base.position_size =
      userConfig.position_size ?? DCA_CONSTRAINTS.defaultPositionSize;
    base.profit_target_pct =
      userConfig.profit_target_pct ?? opt.takeProfitPercent;
    base.stop_loss_pct =
      userConfig.stop_loss_pct ?? -Math.abs(opt.stopLossPercent);
  }

  if (strategyType === "grid_bot") {
    const levels =
      (userConfig.levels as number) ?? (userConfig.grid_levels as number) ?? 10;
    base.grid_levels = userConfig.grid_levels ?? levels;
    base.levels = userConfig.levels ?? levels;
    base.upper_price =
      userConfig.upper_price ?? userConfig.upperPrice ?? undefined;
    base.lower_price =
      userConfig.lower_price ?? userConfig.lowerPrice ?? undefined;
    base.upperPrice = userConfig.upperPrice ?? userConfig.upper_price;
    base.lowerPrice = userConfig.lowerPrice ?? userConfig.lower_price;
  }

  if (strategyType === "ai_copy") {
    base.engine_note = userConfig.engine_note ?? "signal_fusion";
    base.display_mode = userConfig.display_mode ?? "multi_signal_fallback";
  }

  if (strategyType === "ensemble_ai") {
    base.engine = userConfig.engine ?? "ensemble_v2";
    base.max_per_trade = userConfig.maxPerTrade ?? 1000;
    base.auto_adjust_weights = userConfig.autoAdjust ?? true;
  }

  return base;
}

export function getDefaultStrategyDashboardConfigs(): Record<
  ProductStrategyId,
  Record<string, unknown>
> {
  const cons = OPTIMIZED_PROFILES.conservative;
  const mod = OPTIMIZED_PROFILES.moderate;

  return {
    dca_trygg: {
      weeklyAmount: 1000,
      btcAllocation: 70,
      interval_minutes: DCA_CONSTRAINTS.defaultIntervalMinutes,
      position_size: DCA_CONSTRAINTS.defaultPositionSize,
    },
    trend_balansert: {
      riskPerTrade: mod.maxPositionSizePercent / 2,
      stopLoss: mod.stopLossPercent,
      takeProfit: mod.takeProfitPercent,
      fast_period: 12,
      slow_period: 26,
    },
    multisignal_aktiv: { aggressiveness: "normal" },
    simple_grid: {
      // COMBO (mega-plan 2026-08-10): grid ±1.5 % + DCA hver 4. time
      grid_step_pct: 1.5,
      grid_levels: 5,
      grid_amount_pct: 0.05,
      dca_interval_hours: 4,
      dca_amount_pct: 0.02,
      anchor_candles: 48,
      level_tolerance_pct: 0.25,
    },
    grid_bot: {
      upperPrice: 70000,
      lowerPrice: 50000,
      levels: 10,
      grid_levels: 10,
      capital: 5000,
    },
    ensemble_ai: {
      engine: "ensemble",
      useLLM: true,
      riskProfile: "balanced",
      maxPerTrade: 1000,
      autoAdjust: true,
    },
    ai_copy: {
      maxPerTrade: 1000,
      maxLoss: 500,
      engine_note: "signal_fusion",
      display_mode: "multi_signal_fallback",
    },
  };
}

function toKrakenSymbol(pair: string): string {
  return pair.replace("/", "");
}

/** PaperTrading-kort (norsk UI-tekst — i18n kan tas i egen runde) */
export const STRATEGY_CATALOG_PAPER = [
  {
    id: "dca_trygg" as const,
    name: "DCA Trygg",
    symbol: "BTC/USDT",
    risk_level: 1,
    is_active: true,
    description: "Kjøper BTC/ETH automatisk hver uke. Dobler ved store dip.",
    indicators: ["DCA", "Auto-buy"],
    stopLoss: optProfile("dca_trygg").stopLossPercent,
    takeProfit: optProfile("dca_trygg").takeProfitPercent,
  },
  {
    id: "trend_balansert" as const,
    name: "Trend Balansert",
    symbol: "BTC/USDT",
    risk_level: 3,
    is_active: true,
    description: "Følger MA50/MA200 crossover med RSI-filter.",
    indicators: ["MA50", "MA200", "RSI"],
    stopLoss: optProfile("trend_balansert").stopLossPercent,
    takeProfit: optProfile("trend_balansert").takeProfitPercent,
  },
  {
    id: "multisignal_aktiv" as const,
    name: "Multi-Signal Aktiv",
    symbol: "BTC/USDT",
    risk_level: 4,
    is_active: true,
    description: "RSI + MACD + Bollinger gir hyppigere handler.",
    indicators: ["RSI", "MACD", "Bollinger"],
    stopLoss: optProfile("multisignal_aktiv").stopLossPercent,
    takeProfit: optProfile("multisignal_aktiv").takeProfitPercent,
  },
  {
    id: "grid_bot" as const,
    name: "Grid Bot",
    symbol: "BTC/USDT",
    risk_level: 3,
    is_active: true,
    description: "Kjøper lavt, selger høyt i prisgitter.",
    indicators: ["Grid", "Range"],
    stopLoss: optProfile("grid_bot").stopLossPercent,
    takeProfit: optProfile("grid_bot").takeProfitPercent,
  },
  {
    id: "ensemble_ai" as const,
    name: "Ensemble AI",
    symbol: "BTC/USDT",
    risk_level: 3,
    is_active: true,
    description:
      "AI-drevet ensemble-strategi som kombinerer teknisk analyse, LLM og markedsregime.",
    indicators: ["Ensemble", "LLM", "Regime"],
    stopLoss: optProfile("ensemble_ai").stopLossPercent,
    takeProfit: optProfile("ensemble_ai").takeProfitPercent,
  },
  {
    id: "ai_copy" as const,
    name: "AI Copy",
    symbol: "BTC/USDT",
    risk_level: 5,
    is_active: true,
    description:
      "Signal-fusjon (multi-indikator) inntil dedikert copy-motor er på plass.",
    indicators: ["AI", "Signal-fusjon"],
    stopLoss: optProfile("ai_copy").stopLossPercent,
    takeProfit: optProfile("ai_copy").takeProfitPercent,
  },
] as const;

/** StrategyBuilder — tillatte symboler fra optimalisert profil */
export const STRATEGY_CATALOG_BUILDER = STRATEGY_UI_ORDER.map((id) => {
  const opt = optProfile(id);
  const allowed_symbols = opt.allowedPairs.slice(0, 10).map(toKrakenSymbol);
  const names: Record<ProductStrategyId, string> = {
    dca_trygg: "DCA Trygg",
    trend_balansert: "Trend Balansert",
    multisignal_aktiv: "Multi-Signal Aktiv",
    simple_grid: "Pilot (COMBO)",
    grid_bot: "Grid Bot",
    ensemble_ai: "Ensemble AI",
    ai_copy: "AI Copy Trading",
  };
  const descriptions: Record<ProductStrategyId, string> = {
    dca_trygg: "Dollar-cost averaging med lav risiko",
    trend_balansert: "Trend-following med middels risiko",
    multisignal_aktiv: "Multi-indikator strategi med høy aktivitet",
    simple_grid: "COMBO: grid ±1,5 % + DCA hver 4. time — én strategi, null innstillinger",
    grid_bot: "Grid trading i definerte prisområder",
    ensemble_ai: "AI-drevet ensemble-strategi som kombinerer teknisk analyse, LLM og markedsregime",
    ai_copy:
      "Signal-fusjon med AI-vakt — ikke ekte copy-trade mot andre kontoer ennå",
  };
  return {
    id,
    name: names[id],
    risk_level: STRATEGY_DEFS_FOR_DASHBOARD.find((d) => d.type === id)!.risk,
    is_active: true,
    allowed_symbols,
    description: descriptions[id],
  };
});
