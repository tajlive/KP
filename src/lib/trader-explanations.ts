import { formatNOK, formatPercent } from "@/lib/format/currency";
/**
 * Trader Explanations - Forklarer trades på enkel norsk
 * 
 * Gjør teknisk trading-data forståelig for norske småsparere
 * med menneskelig språk, ikke teknisk jargon.
 * 
 * NYTT 2026-04-21: Utvidet med indikator-kontekst, P&L-detaljer,
 * og rikere forklaringer for alle strategityper.
 */

import type { 
  TradeReasonCode, 
  TradeReasonParams, 
  IndicatorSnapshot,
  TradeSide 
} from "@/types/trading";

export type Locale = "no" | "en";

export interface TradeExplanation {
  /** Kort tittel - maks 5-6 ord */
  title: string;
  /** 1-3 setninger med enkel forklaring */
  body: string;
  /** Humør/ikon hint: "positive" | "negative" | "neutral" | "warning" */
  mood: "positive" | "negative" | "neutral" | "warning";
  /** Detaljer for graf-visning */
  details?: {
    indicators: IndicatorSnapshot | null;
    params: TradeReasonParams | null;
  };
}

// ============================================================================
// REASON CODE → EXPLANATION MAPPING
// ============================================================================

type ExplanationTemplate = {
  no: {
    title: string;
    body: string;
  };
  en: {
    title: string;
    body: string;
  };
  mood: TradeExplanation["mood"];
};

const EXPLANATION_TEMPLATES: Record<TradeReasonCode, ExplanationTemplate> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // KJØP-REASONS (med indikator-kontekst)
  // ═══════════════════════════════════════════════════════════════════════════

  RSI_DIP_BUY: {
    no: {
      title: "Kjøpte da RSI var {{rsi}} (underkjøpt)",
      body: "Roboten kjøpte fordi RSI-indikatoren viste {{rsi}} — under 30 betyr at markedet er underkjøpt og kan snu opp. Strategien ser etter slike dyp for å kjøpe litt billigere før en potensiell oppgang."
    },
    en: {
      title: "Bought when RSI was {{rsi}} (oversold)",
      body: "The bot bought because the RSI indicator showed {{rsi}} — below 30 means the market is oversold and may turn up. The strategy looks for these dips to buy cheaper before a potential rise."
    },
    mood: "neutral"
  },

  SMA_CROSSOVER_BUY: {
    no: {
      title: "Golden cross – kjøpte",
      body: "Korttids-gjennomsnittet (f.eks. 20-perioder) krysset over langtids-gjennomsnittet (f.eks. 50-perioder). Dette «golden cross»-signalet indikerer at momentum snur til det positive. Historisk sett følger ofte en sterkere oppgang etter slike kryss."
    },
    en: {
      title: "Golden cross – bought",
      body: "Short-term average (e.g. 20-period) crossed above long-term average (e.g. 50-period). This 'golden cross' signal indicates momentum is turning positive. Historically, a stronger uptrend often follows such crosses."
    },
    mood: "positive"
  },

  TREND_BREAKOUT_BUY: {
    no: {
      title: "Brøt oppover – kjøpte",
      body: "Prisen brøt over etablert motstand (resistance) med høyt volum. Dette «breakout»-signalet kan markere starten på en ny oppgang. Strategien gikk inn tidlig for å fange momentumet."
    },
    en: {
      title: "Broke upward – bought",
      body: "Price broke above established resistance with high volume. This 'breakout' signal may mark the start of a new uptrend. The strategy entered early to capture the momentum."
    },
    mood: "positive"
  },

  GRID_BUY: {
    no: {
      title: "Kjøpte i grid – nivå {{level}}",
      body: "Prisen falt til grid-nivå {{level}} i vårt handelsområde. Grid-strategien kjøper automatisk ved lavere nivåer og selger ved høyere. Slik tjener du på svingninger uten å gjette retningen."
    },
    en: {
      title: "Bought in grid – level {{level}}",
      body: "Price dropped to grid level {{level}} in our trading range. The grid strategy automatically buys at lower levels and sells at higher ones. This way you earn from swings without guessing direction."
    },
    mood: "neutral"
  },

  DCA_INTERVAL_BUY: {
    no: {
      title: "Smart DCA-kjøp",
      body: "Det er på tide å kjøpe mer ifølge Smart DCA-strategien. Ved å kjøpe litt og litt jevnlig, bygger du posisjon uten å prøve å time markedet. Prisen nå er {{price}}."
    },
    en: {
      title: "Smart DCA purchase",
      body: "Time to buy more according to the Smart DCA strategy. By purchasing small amounts regularly, you build your position without trying to time the market. Price now is {{price}}."
    },
    mood: "neutral"
  },

  MULTI_SIGNAL_BUY: {
    no: {
      title: "3+ signaler alignet – kjøpte",
      body: "RSI, SMA-kryss og volum pekte alle i samme retning. Når flere uavhengige indikatorer aligner, øker sannsynligheten for en vellykket trade betydelig. Konfidens: {{confidence}}%."
    },
    en: {
      title: "3+ signals aligned – bought",
      body: "RSI, SMA crossover and volume all pointed in the same direction. When multiple independent indicators align, the probability of a successful trade increases significantly. Confidence: {{confidence}}%."
    },
    mood: "positive"
  },

  MEAN_REVERSION_BUY: {
    no: {
      title: "Kjøpte {{deviation}}% under normalpris",
      body: "Prisen hadde falt {{deviation}}% under sin 20-dagers gjennomsnitt. Mean reversion-strategien antar at ekstreme avvik gjerne vender tilbake til normalen. Dette var et godt kjøpsnivå basert på historisk volatilitet."
    },
    en: {
      title: "Bought {{deviation}}% below normal",
      body: "Price had fallen {{deviation}}% below its 20-day average. The mean reversion strategy assumes extreme deviations tend to revert to normal. This was a good buying level based on historical volatility."
    },
    mood: "neutral"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SALG-REASONS (med P&L-kontekst)
  // ═══════════════════════════════════════════════════════════════════════════

  TAKE_PROFIT_SELL: {
    no: {
      title: "Tok gevinst – +{{profit}}",
      body: "Målprisen ble nådd! Strategien sikret en gevinst på {{profit}}. Å ta gevinst på planlagte nivåer er god disiplin. Du kan alltid gå inn igjen hvis trenden fortsetter."
    },
    en: {
      title: "Took profit – +{{profit}}",
      body: "Target price reached! The strategy secured a profit of {{profit}}. Taking profit at planned levels is good discipline. You can always re-enter if the trend continues."
    },
    mood: "positive"
  },

  STOP_LOSS_SELL: {
    no: {
      title: "Stoploss trigget – {{loss}}",
      body: "Prisen falt til stoploss-nivået. Risikostyring i praksis: Vi aksepterer et kontrollert tap på {{loss}} for å unngå større fall. Selv gode strategier har tapende trades – det viktige er at tapene er små mens gevinstene er større."
    },
    en: {
      title: "Stop-loss triggered – {{loss}}",
      body: "Price hit the stop-loss level. Risk management in practice: We accept a controlled loss of {{loss}} to avoid larger drops. Even good strategies have losing trades – what matters is that losses are small while gains are larger."
    },
    mood: "negative"
  },

  TRAILING_TP_SELL: {
    no: {
      title: "Trailing TP – sikret +{{profit}}",
      body: "Prisen falt {{drop}}% fra toppen, så trailing take-profit solgte for å sikre {{profit}}. Bedre å ta litt mindre gevinst enn å risikere å miste alt."
    },
    en: {
      title: "Trailing TP – secured +{{profit}}",
      body: "Price dropped {{drop}}% from the peak, so trailing take-profit sold to lock in {{profit}}. Better to take slightly less profit than risk losing it all."
    },
    mood: "positive"
  },

  PARTIAL_TP_SELL: {
    no: {
      title: "Solgte {{sellPct}}% – sikret +{{profit}}",
      body: "Strategien solgte {{sellPct}}% av posisjonen for å sikre {{profit}} i gevinst. Resten av posisjonen fortsatt i markedet. Slik balanserer vi mellom å sikre gevinst og beholde oppside."
    },
    en: {
      title: "Sold {{sellPct}}% – secured +{{profit}}",
      body: "The strategy sold {{sellPct}}% of the position to lock in {{profit}} profit. The rest of the position remains in the market. This balances between securing gains and keeping upside."
    },
    mood: "positive"
  },

  TREND_REVERSAL_SELL: {
    no: {
      title: "Trenden snudde – solgte",
      body: "Markedsforholdene endret seg: SMA-krysset vendte ned og volum økte på salgssiden. Strategien valgte å komme seg ut mens det fortsatt var {{pnl}} i posisjonen."
    },
    en: {
      title: "Trend reversed – sold",
      body: "Market conditions changed: SMA crossover turned down and volume increased on the sell side. The strategy chose to exit while there was still {{pnl}} in the position."
    },
    mood: "warning"
  },

  SMA_CROSSOVER_SELL: {
    no: {
      title: "Death cross – solgte",
      body: "Korttids-gjennomsnittet krysset under langtids-gjennomsnittet. Dette «death cross»-signalet indikerer at momentum snur nedover. Strategien valgte å selge før et potensielt større fall."
    },
    en: {
      title: "Death cross – sold",
      body: "Short-term average crossed below long-term average. This 'death cross' signal indicates momentum is turning downward. The strategy chose to sell before a potential larger drop."
    },
    mood: "warning"
  },

  MANUAL_SELL: {
    no: {
      title: "Du solgte manuelt",
      body: "Du valgte å selge manuelt. Strategien ble overstyrt av deg – dette gir deg full kontroll når du vil ta gevinst eller kutte tap."
    },
    en: {
      title: "You sold manually",
      body: "You chose to sell manually. The strategy was overridden by you – this gives you full control when you want to take profit or cut losses."
    },
    mood: "neutral"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RISK/GUARDRAIL BLOCKS
  // ═══════════════════════════════════════════════════════════════════════════

  DAILY_DRAWDOWN_HIT: {
    no: {
      title: "Pauset – tapsgrense nådd",
      body: "Daglig tapsgrense på {{loss}} er nådd. Dette er en innebygd sikkerhet for å unngå større tap på én dag. Trading pauses til i morgen."
    },
    en: {
      title: "Paused – loss limit reached",
      body: "Daily loss limit of {{loss}} has been reached. This is a built-in safety feature to avoid larger losses in one day. Trading pauses until tomorrow."
    },
    mood: "warning"
  },

  EDGE_FILTER_SKIP: {
    no: {
      title: "Ingen trade – for lav forventning",
      body: "Strategien så et signal, men forventet gevinst etter fees var for lav ({{edge}}%). Vi skipper trades der potensialet ikke er stort nok til å forsvare risikoen."
    },
    en: {
      title: "No trade – low expectation",
      body: "The strategy saw a signal, but expected profit after fees was too low ({{edge}}%). We skip trades where the potential isn't large enough to justify the risk."
    },
    mood: "neutral"
  },

  GLOBAL_RISK_LIMIT_HIT: {
    no: {
      title: "Pauset – total risiko for høy",
      body: "Total risiko på tvers av alle strategier har nådd {{risk}}%-grensen. Alle bots pauses for å beskytte total kapital."
    },
    en: {
      title: "Paused – total risk too high",
      body: "Total risk across all strategies has reached the {{risk}}% limit. All bots pause to protect overall capital."
    },
    mood: "warning"
  },

  DARK_FLEET_ENSEMBLE_BUY: {
    no: {
      title: "AI Ensemble kjøpte",
      body: "Dark Fleet AI ga et kjøpssignal med ensemble score {{confidence}}. Kombinasjonen av regime-deteksjon, teknisk analyse og konfluent signaler indikerer en høy-sannsynlighets oppgang."
    },
    en: {
      title: "AI Ensemble bought",
      body: "Dark Fleet AI gave a buy signal with ensemble score {{confidence}}. The combination of regime detection, technical analysis, and confluent signals indicates a high-probability uptrend."
    },
    mood: "positive"
  },

  DARK_FLEET_ENSEMBLE_SELL: {
    no: {
      title: "AI Ensemble solgte",
      body: "Dark Fleet AI ga et salgssignal med ensemble score {{confidence}}. Kombinasjonen av regime-deteksjon, teknisk analyse og konfluent signaler indikerer en høy-sannsynlighets nedgang."
    },
    en: {
      title: "AI Ensemble sold",
      body: "Dark Fleet AI gave a sell signal with ensemble score {{confidence}}. The combination of regime detection, technical analysis, and confluent signals indicates a high-probability downtrend."
    },
    mood: "negative"
  },

  DARK_FLEET_REGIME_HOLD: {
    no: {
      title: "AI Hold — usikkert marked",
      body: "Dark Fleet vurderte markedet som usikkert og valgte å ikke handle. Dette beskytter kapitalen din i uforutsigbare markedsforhold."
    },
    en: {
      title: "AI Hold — uncertain market",
      body: "Dark Fleet assessed the market as uncertain and chose not to trade. This protects your capital in unpredictable market conditions."
    },
    mood: "neutral"
  },

  DARK_FLEET_ML_RISK_BLOCKED: {
    no: {
      title: "AI risiko-blokkering",
      body: "Dark Fleet ML-modellen vurderte risikoen som for høy ({{drawdownPct}}%). Trade ble blokkert for å beskytte kapitalen din."
    },
    en: {
      title: "AI risk blocked",
      body: "Dark Fleet ML model assessed the risk as too high ({{drawdownPct}}%). Trade was blocked to protect your capital."
    },
    mood: "warning"
  },

  UNKNOWN: {
    no: {
      title: "Trade utført",
      body: "En trade ble utført basert på strategiens kriterier. Detaljert forklaring er ikke tilgjengelig for denne hendelsen."
    },
    en: {
      title: "Trade executed",
      body: "A trade was executed based on the strategy's criteria. Detailed explanation is not available for this event."
    },
    mood: "neutral"
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(value: number | undefined | null, locale: Locale, decimals = 2): string {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(locale === "no" ? "nb-NO" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}



/**
 * Erstatt placeholders i tekst med faktiske verdier fra indikatorer og params
 */
function interpolateTemplate(
  template: string,
  params: TradeReasonParams | null,
  indicators: IndicatorSnapshot | null,
  locale: Locale
): string {
  if (!params && !indicators) return template;
  
  let result = template;
  
  // Params interpolation
  if (params) {
    if (params.profitPct !== undefined) {
      result = result.replace(/\{\{profit\}\}/g, formatPercent(params.profitPct, locale));
    }
    if (params.lossPct !== undefined) {
      result = result.replace(/\{\{loss\}\}/g, formatPercent(params.lossPct, locale));
    }
    if (params.rsi !== undefined) {
      result = result.replace(/\{\{rsi\}\}/g, Math.round(params.rsi).toString());
    }
    if (params.gridLevel !== undefined) {
      result = result.replace(/\{\{level\}\}/g, params.gridLevel.toString());
    }
    if (params.confidence !== undefined) {
      result = result.replace(/\{\{confidence\}\}/g, Math.round(Number(params.confidence)).toString());
    }
    if (params.deviation !== undefined) {
      result = result.replace(/\{\{deviation\}\}/g, formatPercent(Number(params.deviation), locale));
    }
    if (params.drop !== undefined) {
      result = result.replace(/\{\{drop\}\}/g, formatPercent(Number(params.drop), locale));
    }
    if (params.dropFromPeak !== undefined) {
      result = result.replace(/\{\{drop\}\}/g, formatPercent(Number(params.dropFromPeak), locale));
    }
    if (params.sellPct !== undefined) {
      result = result.replace(/\{\{sellPct\}\}/g, Math.round(Number(params.sellPct)).toString());
    }
    if (params.edge !== undefined) {
      result = result.replace(/\{\{edge\}\}/g, formatPercent(Number(params.edge), locale));
    }
    if (params.expectedEdge !== undefined) {
      result = result.replace(/\{\{edge\}\}/g, formatPercent(Number(params.expectedEdge), locale));
    }
    if (params.risk !== undefined) {
      result = result.replace(/\{\{risk\}\}/g, formatPercent(Number(params.risk), locale));
    }
    if (params.drawdownPct !== undefined) {
      result = result.replace(/\{\{loss\}\}/g, formatPercent(Number(params.drawdownPct), locale));
    }
    if (params.price !== undefined) {
      result = result.replace(/\{\{price\}\}/g, formatNumber(Number(params.price), locale, 0));
    }
  }

  // Indicators interpolation
  if (indicators) {
    if (indicators.rsi !== undefined) {
      result = result.replace(/\{\{rsi\}\}/g, Math.round(Number(indicators.rsi)).toString());
    }
    if (indicators.sma_20 !== undefined && indicators.sma_50 !== undefined) {
      const sma20 = Number(indicators.sma_20);
      const sma50 = Number(indicators.sma_50);
      result = result.replace(/\{\{smaDiff\}\}/g, formatPercent(((sma20 - sma50) / sma50) * 100, locale));
    }
  }

  // P&L interpolation (calculated from realized_pnl if available)
  // Note: realized_pnl is passed via params in some cases
  if (params?.realizedPnl !== undefined) {
    const pnl = Number(params.realizedPnl);
    result = result.replace(/\{\{pnl\}\}/g, formatNOK(pnl, locale));
    result = result.replace(/\{\{profit\}\}/g, formatNOK(Math.max(0, pnl), locale));
    result = result.replace(/\{\{loss\}\}/g, formatNOK(Math.min(0, pnl), locale));
  }
  
  // Clean up any remaining placeholders
  result = result.replace(/\{\{\w+\}\}/g, "-");
  
  return result;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export interface GenerateExplanationInput {
  reasonCode: TradeReasonCode | null | undefined;
  reasonParams: TradeReasonParams | null | undefined;
  indicatorSnapshot: IndicatorSnapshot | null | undefined;
  side: TradeSide;
  locale?: Locale;
}

export function generateExplanation(
  input: GenerateExplanationInput
): TradeExplanation {
  const {
    reasonCode,
    reasonParams,
    indicatorSnapshot,
    side,
    locale = "no"
  } = input;

  const code: TradeReasonCode = reasonCode || "UNKNOWN";
  const template = EXPLANATION_TEMPLATES[code] || EXPLANATION_TEMPLATES.UNKNOWN;
  const localized = template[locale];
  
  const title = interpolateTemplate(localized.title, reasonParams ?? null, indicatorSnapshot ?? null, locale);
  const body = interpolateTemplate(localized.body, reasonParams ?? null, indicatorSnapshot ?? null, locale);
  
  return {
    title,
    body,
    mood: template.mood,
    details: {
      indicators: indicatorSnapshot || null,
      params: reasonParams || null
    }
  };
}

export function generateTimelineExplanations(
  trades: Array<{
    id: string;
    executed_at: string;
    side: TradeSide;
    reason_code?: TradeReasonCode;
    reason_params?: TradeReasonParams;
    indicator_snapshot?: IndicatorSnapshot;
    price: number;
    total_value: number;
    realized_pnl?: number | null;
  }>,
  locale: Locale = "no"
): Array<{
  id: string;
  time: string;
  side: TradeSide;
  explanation: TradeExplanation;
  price: number;
  value: number;
  pnl?: number | null;
}> {
  return trades.map(trade => ({
    id: trade.id,
    time: trade.executed_at,
    side: trade.side,
    explanation: generateExplanation({
      reasonCode: trade.reason_code,
      reasonParams: trade.reason_params,
      indicatorSnapshot: trade.indicator_snapshot,
      side: trade.side,
      locale
    }),
    price: trade.price,
    value: trade.total_value,
    pnl: trade.realized_pnl
  }));
}

export function getMoodColor(mood: TradeExplanation["mood"]): string {
  switch (mood) {
    case "positive": return "#22c55e";
    case "negative": return "#ef4444";
    case "warning": return "#f59e0b";
    case "neutral": return "#6b7280";
    default: return "#6b7280";
  }
}

export function getMoodIcon(mood: TradeExplanation["mood"]): string {
  switch (mood) {
    case "positive": return "TrendingUp";
    case "negative": return "TrendingDown";
    case "warning": return "AlertTriangle";
    case "neutral": return "Minus";
    default: return "Minus";
  }
}
