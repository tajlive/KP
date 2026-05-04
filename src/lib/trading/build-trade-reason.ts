/**
 * Build Trade Reason - Mapper intern logikk til reasonCode + params
 * 
 * Konverterer tekniske indikatorer (RSI, SMA, etc.) til
 * TradeReasonCode og TradeReasonParams for lagring og forklaring.
 */

import type {
  TradeReasonCode,
  TradeReasonParams,
  IndicatorSnapshot,
  TradeSide,
} from "@/types/trading";

// Re-export for consumers
export type { TradeReasonCode, TradeReasonParams };

export type SignalIndicators = {
  strategy?: string;
  rsi?: number;
  macd?: number;
  signal?: number;
  fast_sma?: number;
  slow_sma?: number;
  crossedAbove?: boolean;
  crossedBelow?: boolean;
  pnl_pct?: number;
  target?: number;
  stop_loss?: number;
  interval?: number;
  volatility_adjusted?: boolean;
  grid_level?: number;
  buy_at?: number;
  sell_at?: number;
  drop_from_peak?: number;
  trailing_stop?: boolean;
  partial_tp?: boolean;
  buy_signals?: number;
  sell_signals?: number;
  [key: string]: boolean | number | string | undefined;
}

export interface BuildReasonInput {
  side: TradeSide;
  strategyKey: string;
  indicators: SignalIndicators | Record<string, unknown> | undefined | null;
  currentPrice: number;
  candles: Array<{ close: number; high?: number; low?: number }>;
  entryPrice?: number;
}

/**
 * Bygg indicator snapshot fra candle-data
 */
export function buildIndicatorSnapshot(
  candles: Array<{ close: number; high?: number; low?: number }>,
  indicators: SignalIndicators | Record<string, unknown> | null
): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const price24hAgo = closes.length >= 24 ? closes[closes.length - 24] : closes[0];
  
  // Beregn volatilitet (ATR-simple)
  let volatility = 0;
  if (closes.length >= 14) {
    const ranges = [];
    for (let i = closes.length - 14; i < closes.length; i++) {
      const high = candles[i]?.high || closes[i];
      const low = candles[i]?.low || closes[i];
      ranges.push(high - low);
    }
    volatility = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  }

  // Helper to safely get number from indicators
  const getNum = (key: string): number | undefined => {
    const val = indicators?.[key];
    return typeof val === 'number' ? val : undefined;
  };

  return {
    price: currentPrice,
    price_24h_ago: price24hAgo,
    rsi: getNum('rsi'),
    macd: getNum('macd'),
    macd_signal: getNum('signal'),
    sma_20: getNum('fast_sma'),
    sma_50: getNum('slow_sma'),
    volatility,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mapper strategi og indikatorer til TradeReasonCode
 */
export function buildTradeReason(
  input: BuildReasonInput
): {
  reasonCode: TradeReasonCode;
  reasonParams: TradeReasonParams;
} {
  const { side, strategyKey, indicators, currentPrice, candles, entryPrice } = input;

  // Helper to safely get values from indicators
  const get = (key: string): unknown => indicators?.[key];
  const getNum = (key: string): number | undefined => {
    const val = get(key);
    return typeof val === 'number' ? val : undefined;
  };
  const getBool = (key: string): boolean | undefined => {
    const val = get(key);
    return typeof val === 'boolean' ? val : undefined;
  };

  const closes = candles.map((c) => c.close);
  const price24hAgo = closes.length >= 24 ? closes[closes.length - 24] : closes[0];
  const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

  // Default params
  const baseParams: TradeReasonParams = {
    priceChange24h: Math.round(priceChange24h * 100) / 100,
  };

  // === KJØP-REASONS ===
  if (side === "buy") {
    // Dark Fleet ensemble buy
    if (getBool('darkFleet') === true) {
      const ensembleScore = getNum('ensembleScore');
      const regime = get('regime') as string | undefined;
      return {
        reasonCode: "DARK_FLEET_ENSEMBLE_BUY",
        reasonParams: {
          ...baseParams,
          confidence: ensembleScore !== undefined ? Math.round(ensembleScore * 100) / 100 : undefined,
        },
      };
    }

    // Grid strategy
    const gridLevel = getNum('grid_level');
    if (strategyKey === "grid" || gridLevel !== undefined) {
      return {
        reasonCode: "GRID_BUY",
        reasonParams: {
          ...baseParams,
          gridLevel,
        },
      };
    }

    // DCA strategy
    const interval = getNum('interval');
    if (strategyKey === "dca" || interval !== undefined) {
      return {
        reasonCode: "DCA_INTERVAL_BUY",
        reasonParams: {
          ...baseParams,
          intervalMinutes: interval,
        },
      };
    }

    // RSI dip buy
    const rsi = getNum('rsi');
    if (rsi !== undefined && rsi < 45) {
      return {
        reasonCode: "RSI_DIP_BUY",
        reasonParams: {
          ...baseParams,
          rsi: Math.round(rsi * 10) / 10,
        },
      };
    }

    // SMA crossover
    if (getBool('crossedAbove') === true) {
      return {
        reasonCode: "SMA_CROSSOVER_BUY",
        reasonParams: {
          ...baseParams,
          smaFast: Math.round((getNum('fast_sma') || 0) * 100) / 100,
          smaSlow: Math.round((getNum('slow_sma') || 0) * 100) / 100,
        },
      };
    }

    // Multi-signal
    const buySignals = getNum('buy_signals');
    const sellSignals = getNum('sell_signals');
    if (buySignals !== undefined || sellSignals !== undefined) {
      return {
        reasonCode: "MULTI_SIGNAL_BUY",
        reasonParams: {
          ...baseParams,
          confidence: buySignals 
            ? Math.round((buySignals / 3) * 100) / 100 
            : undefined,
        },
      };
    }

    // Trend breakout
    if (strategyKey === "trend_follow" || strategyKey === "trend") {
      return {
        reasonCode: "TREND_BREAKOUT_BUY",
        reasonParams: baseParams,
      };
    }

    // Mean reversion
    if (strategyKey === "mean_reversion") {
      return {
        reasonCode: "MEAN_REVERSION_BUY",
        reasonParams: {
          ...baseParams,
          rsi: rsi !== undefined ? Math.round(rsi * 10) / 10 : undefined,
        },
      };
    }

    // Fallback buy
    return {
      reasonCode: "MULTI_SIGNAL_BUY",
      reasonParams: baseParams,
    };
  }

  // === SALG-REASONS ===
  if (side === "sell") {
    // Dark Fleet ensemble sell
    if (getBool('darkFleet') === true) {
      const ensembleScore = getNum('ensembleScore');
      const regime = get('regime') as string | undefined;
      return {
        reasonCode: "DARK_FLEET_ENSEMBLE_SELL",
        reasonParams: {
          ...baseParams,
          confidence: ensembleScore !== undefined ? Math.round(Math.abs(ensembleScore) * 100) / 100 : undefined,
        },
      };
    }

    const trailingStop = getBool('trailing_stop');
    const dropFromPeak = getNum('drop_from_peak');
    const target = getNum('target');
    const pnlPct = getNum('pnl_pct');
    const stopLoss = getNum('stop_loss');
    
    // Trailing take profit
    if (trailingStop === true || dropFromPeak !== undefined) {
      return {
        reasonCode: "TRAILING_TP_SELL",
        reasonParams: {
          ...baseParams,
          dropFromPeak: dropFromPeak !== undefined 
            ? Math.round(dropFromPeak * 100) / 100 
            : undefined,
        },
      };
    }

    // Partial take profit
    if (getBool('partial_tp') === true) {
      return {
        reasonCode: "PARTIAL_TP_SELL",
        reasonParams: {
          ...baseParams,
          profitPct: entryPrice 
            ? Math.round(((currentPrice - entryPrice) / entryPrice) * 10000) / 100 
            : undefined,
        },
      };
    }

    // Regular take profit
    if (target !== undefined && pnlPct !== undefined) {
      if (pnlPct > 0) {
        return {
          reasonCode: "TAKE_PROFIT_SELL",
          reasonParams: {
            ...baseParams,
            profitPct: Math.round(pnlPct * 100) / 100,
          },
        };
      }
    }

    // Stop loss
    if (stopLoss !== undefined && pnlPct !== undefined) {
      if (pnlPct < 0) {
        return {
          reasonCode: "STOP_LOSS_SELL",
          reasonParams: {
            ...baseParams,
            lossPct: Math.round(Math.abs(pnlPct) * 100) / 100,
          },
        };
      }
    }

    // SMA crossover sell
    if (getBool('crossedBelow') === true) {
      return {
        reasonCode: "SMA_CROSSOVER_SELL",
        reasonParams: {
          ...baseParams,
          smaFast: Math.round((getNum('fast_sma') || 0) * 100) / 100,
          smaSlow: Math.round((getNum('slow_sma') || 0) * 100) / 100,
        },
      };
    }

    // Trend reversal
    if (strategyKey === "trend_follow" || strategyKey === "trend") {
      return {
        reasonCode: "TREND_REVERSAL_SELL",
        reasonParams: baseParams,
      };
    }

    // Fallback sell with PnL
    if (pnlPct !== undefined && pnlPct > 0) {
      return {
        reasonCode: "TAKE_PROFIT_SELL",
        reasonParams: {
          ...baseParams,
          profitPct: Math.round(pnlPct * 100) / 100,
        },
      };
    }

    return {
      reasonCode: "STOP_LOSS_SELL",
      reasonParams: baseParams,
    };
  }

  // Fallback
  return {
    reasonCode: "UNKNOWN",
    reasonParams: baseParams,
  };
}

/**
 * Map strategy_id til strategyKey
 */
export function resolveStrategyKey(strategyId: string): string {
  const normalized = strategyId.toLowerCase();
  
  if (normalized.includes("grid")) return "grid";
  if (normalized.includes("dca")) return "dca";
  if (normalized.includes("trend")) return "trend_follow";
  if (normalized.includes("multi")) return "multi_signal";
  if (normalized.includes("breakout")) return "breakout";
  if (normalized.includes("mean")) return "mean_reversion";
  
  return normalized;
}


/**
 * ============================================================================
 * RICH TRADE EXPLANATIONS — Brukervennlige forklaringer på norsk
 * ============================================================================
 * 
 * Disse forklaringene vises til brukeren i stedet for tekniske reasonCodes.
 * Hver forklaring er skrevet for å hjelpe brukeren forstå HVORFOR boten handlet.
 */

export interface TradeExplanation {
  /** Kort tittel (1-3 ord) */
  title: string;
  /** Full forklaring i naturlig språk */
  description: string;
  /** Konfidens-nivå: 1-3 */
  confidence: 1 | 2 | 3;
  /** Emoji for visuell identifikasjon */
  emoji: string;
  /** Tips til brukeren */
  tip?: string;
}

const EXPLANATIONS: Record<TradeReasonCode, (params: TradeReasonParams) => TradeExplanation> = {
  RSI_DIP_BUY: (p) => ({
    title: "Oversolgt marked",
    description: `RSI-indikatoren viser ${p.rsi ?? 'lav'} — markedet er oversolgt. Dette betyr at prisen har falt mye på kort tid, og det kan være en god kjøpsmulighet. Boten kjøper når andre selger i panikk.`,
    confidence: p.rsi && p.rsi < 30 ? 3 : 2,
    emoji: "🟢",
    tip: "RSI under 30 = sterkt kjøpssignal. Men i krasj kan RSI forbitt lavt lenge.",
  }),

  SMA_CROSSOVER_BUY: (p) => ({
    title: "Trendoppgang bekreftet",
    description: `Den kortsiktige trenden (${p.smaFast ?? 'rask'} SMA) har krysset OVER den langsiktige (${p.smaSlow ?? 'langsom'} SMA). Dette er et klassisk teknisk signal som indikerer at oppgangen har momentum.`,
    confidence: 3,
    emoji: "📈",
    tip: "SMA-crossover fungerer best i trendende markeder. Unngå i svingende (sideways) perioder.",
  }),

  GRID_BUY: (p) => ({
    title: "Grid-kjøp",
    description: `Prisen har falt til nivå ${p.gridLevel ?? '?'} i gitteret ($${p.buyAt ?? '?'}). Grid-strategien kjøper lavt og selger høyt automatisk innenfor et definert prisområde.`,
    confidence: 2,
    emoji: "🔲",
    tip: "Grid fungerer best når markedet svinger opp og ned innenfor et område.",
  }),

  DCA_INTERVAL_BUY: (p) => ({
    title: "Planlagt DCA-kjøp",
    description: `Dollar-Cost Averaging: Boten kjøper fast beløp med jevne mellomrom (${p.intervalMinutes ?? '?'} min). Dette utjevner prissvingninger over tid — du trenger ikke time markedet.`,
    confidence: 2,
    emoji: "⏰",
    tip: "DCA er trygt i ustabile markeder, men gir lavere avkastning enn å kjøpe bunnen.",
  }),

  MULTI_SIGNAL_BUY: (p) => ({
    title: "Flere signaler enige",
    description: `${p.confidence ? Math.round((p.confidence as number) * 100) + '%' : 'Flere'} av indikatorene (RSI, MACD, momentum) peker oppover. Når flere indikatorer er enige, er sannsynligheten for en god trade høyere.`,
    confidence: p.confidence && (p.confidence as number) >= 0.67 ? 3 : 2,
    emoji: "🎯",
    tip: "Multi-signal reduserer falske signaler ved å kreve bekreftelse fra flere kilder.",
  }),

  TREND_BREAKOUT_BUY: (p) => ({
    title: "Trendbrudd",
    description: `Prisen har brutt over en motstandslinje eller trendkanal. Dette signaliserer at kjøpere har overtaket og at en ny oppgang kan være i gang.`,
    confidence: 2,
    emoji: "🚀",
    tip: "Trendbrudd er kraftige signaler, men falske brudd (fakeouts) skjer ofte.",
  }),

  MEAN_REVERSION_BUY: (p) => ({
    title: "Tilbake til gjennomsnitt",
    description: `Prisen har falt langt under det normale (Bollinger lower band). Strategien satser på at prisen vil studse tilbake mot gjennomsnittet.`,
    confidence: 2,
    emoji: "🪃",
    tip: "Mean reversion fungerer dårlig i sterke trender — prisen kan fortsette å falle.",
  }),

  TRAILING_TP_SELL: (p) => ({
    title: "Trailing stop aktivert",
    description: `Prisen har falt ${p.dropFromPeak ?? '?'}% fra toppen. Boten solgte for å BESKYTTE gevinsten din — bedre å ta litt profitt nå enn å risikere et større fall.`,
    confidence: 3,
    emoji: "🛡️",
    tip: "Trailing stop er din beste venn. Den låser inn profitt mens den fortsatt lar vinnerne løpe.",
  }),

  PARTIAL_TP_SELL: (p) => ({
    title: "Delvis gevinstsikring",
    description: `Du har tatt ut ${p.profitPct ?? '?'}% av gevinsten. Resten av posisjonen fortsetter å jobbe for deg. Dette er smart risikostyring — ta litt profitt, behold litt eksponering.`,
    confidence: 3,
    emoji: "💰",
    tip: "Partial TP reduserer risiko uten å gå glipp av videre oppgang.",
  }),

  TAKE_PROFIT_SELL: (p) => ({
    title: "Profit target nådd",
    description: `Gevinstmålet er nådd med ${p.profitPct ?? '?'}% profitt! Boten solgte for å realisere gevinsten. En vunnet handel er alltid bedre enn en tapende.`,
    confidence: 3,
    emoji: "✅",
    tip: "Ta profitt er en vane. De beste traderne tar profitt konsekvent.",
  }),

  STOP_LOSS_SELL: (p) => ({
    title: "Stop loss aktivert",
    description: `Tapsgrensen ble nådd ved ${p.lossPct ?? '?'}% tap. Boten solgte for å BEGRENSE skaden. Små tap er en del av trading — det viktige er at de ikke blir STORE tap.`,
    confidence: 3,
    emoji: "🛑",
    tip: "Alle traderne har tap. Forskjellen på amatører og proffer er at proffer beskytter kapitalen.",
  }),

  SMA_CROSSOVER_SELL: (p) => ({
    title: "Trendreversering",
    description: `Den kortsiktige trenden (${p.smaFast ?? 'rask'} SMA) har krysset UNDER den langsiktige (${p.smaSlow ?? 'langsom'} SMA). Dette signaliserer at oppgangen kan være over.`,
    confidence: 2,
    emoji: "📉",
    tip: "SMA crossunder er et tidlig varsel. Kombiner med volum for bedre bekreftelse.",
  }),

  TREND_REVERSAL_SELL: (p) => ({
    title: "Trenden har snudd",
    description: `Tekniske indikatorer viser at den underliggende trenden har snudd fra oppgang til nedgang. Boten selger for å unngå å sitte i en fallende posisjon.`,
    confidence: 2,
    emoji: "↩️",
    tip: "Å selge når trenden snur er vanskelig psykologisk, men kritisk for langsiktig suksess.",
  }),

  DAILY_DRAWDOWN_HIT: () => ({
    title: "Daglig tapsgrense nådd",
    description: "Daglig tapsgrense er nådd. Boten har stoppet trading for i dag for å beskytte kapitalen din. Den starter igjen i morgen.",
    confidence: 3,
    emoji: "🚫",
    tip: "Dette er risikostyring som beskytter deg. Bedre å ta en pause enn å jage tap.",
  }),

  EDGE_FILTER_SKIP: () => ({
    title: "For svakt signal",
    description: "Signalet var for svakt til å handle på. Boten krever en minimum 'edge' (forventet avkastning) før den trader. Dette filtrerer ut dårlige trades.",
    confidence: 2,
    emoji: "🔄",
    tip: "Edge-filteret reduserer antall trades, men øker kvaliteten på de som gjennomføres.",
  }),

  GLOBAL_RISK_LIMIT_HIT: () => ({
    title: "Global risiko-grense nådd",
    description: "Den totale risikoen i porteføljen har nådd grensen. Boten vil ikke åpne nye posisjoner før eksisterende posisjoner reduserer risikoen.",
    confidence: 3,
    emoji: "⚠️",
    tip: "Portefølje-beskyttelse er kritisk. Aldri risiker mer enn du har råd til å tape.",
  }),

  MANUAL_SELL: () => ({
    title: "Manuelt salg",
    description: "Du solgte posisjonen manuelt. Boten respekterer alltid dine manuelle beslutninger.",
    confidence: 3,
    emoji: "👤",
  }),

  DARK_FLEET_ENSEMBLE_BUY: (p) => ({
    title: "AI Ensemble — Kjøp",
    description: `Dark Fleet AI ga kjøpssignal med ensemble score ${p.confidence ?? '?'}. Kombinasjonen av regime-deteksjon, teknisk analyse og konfluent signaler indikerer en høy-sannsynlighets oppgang.`,
    confidence: p.confidence && (p.confidence as number) >= 0.5 ? 3 : 2,
    emoji: "🤖",
    tip: "Dark Fleet bruker flere AI-modeller samtidig. Høyere ensemble score = sterkere signal.",
  }),

  DARK_FLEET_ENSEMBLE_SELL: (p) => ({
    title: "AI Ensemble — Salg",
    description: `Dark Fleet AI ga salgssignal med ensemble score ${p.confidence ?? '?'}. Kombinasjonen av regime-deteksjon, teknisk analyse og konfluent signaler indikerer en høy-sannsynlighets nedgang.`,
    confidence: p.confidence && (p.confidence as number) >= 0.5 ? 3 : 2,
    emoji: "🤖",
    tip: "Dark Fleet bruker flere AI-modeller samtidig. Høyere ensemble score = sterkere signal.",
  }),

  DARK_FLEET_REGIME_HOLD: () => ({
    title: "AI Hold — Uskikket regime",
    description: "Dark Fleet vurderte markedet som usikkert (høy volatilitet eller ukjent regime). Boten valgte å ikke handle for å beskytte kapitalen.",
    confidence: 2,
    emoji: "🛡️",
    tip: "Å ikke handle er også en beslutning. Dark Fleet unngår trading i usikre markeder.",
  }),

  DARK_FLEET_ML_RISK_BLOCKED: (p) => ({
    title: "AI Risiko-blokkering",
    description: `Dark Fleet ML-modellen vurderte risikoen som for høy (${p.drawdownPct ?? '?'}%). Trade ble blokkert for å beskytte kapitalen.`,
    confidence: 3,
    emoji: "🚫",
    tip: "ML risk assessment justerer position size dynamisk basert på markedsvolatilitet og historisk performance.",
  }),

  UNKNOWN: () => ({
    title: "Handel utført",
    description: "Boten har utført en handel basert på sine strategiparametere. Se indikator-snapshot for detaljer.",
    confidence: 1,
    emoji: "❓",
  }),
};

/**
 * Bygg en rik, brukervennlig forklaring fra reasonCode og params.
 */
export function buildTradeExplanation(
  reasonCode: TradeReasonCode,
  params: TradeReasonParams,
): TradeExplanation {
  const builder = EXPLANATIONS[reasonCode] || EXPLANATIONS.UNKNOWN;
  return builder(params);
}

/**
 * Kort versjon for tooltip/liste-visning
 */
export function buildShortExplanation(
  reasonCode: TradeReasonCode,
  params: TradeReasonParams,
): string {
  const exp = buildTradeExplanation(reasonCode, params);
  return `${exp.emoji} ${exp.title}${params.profitPct ? ` (+${params.profitPct}%)` : params.lossPct ? ` (-${params.lossPct}%)` : ''}`;
}
