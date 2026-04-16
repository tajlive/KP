/**
 * Trader Explanations - Forklarer trades på enkel norsk
 * 
 * Gjør teknisk trading-data forståelig for norske småsparere
 * med menneskelig språk, ikke teknisk jargon.
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
  /** 1-2 setninger med enkel forklaring */
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
  // KJØP-REASONS
  RSI_DIP_BUY: {
    no: {
      title: "Kjøpte da prisen falt",
      body: "Roboten kjøpte fordi markedet hadde falt litt på kort tid. Strategien ser etter slike små dyp for å kjøpe litt billigere."
    },
    en: {
      title: "Bought on price dip",
      body: "The bot bought because the market had dropped slightly. The strategy looks for these small dips to buy at better prices."
    },
    mood: "neutral"
  },

  SMA_CROSSOVER_BUY: {
    no: {
      title: "Krysset over – kjøpte",
      body: "Korttids-trenden krysset over langtids-trenden. Dette er et klassisk kjøpssignal som indikerer at momentum kan snu oppover."
    },
    en: {
      title: "Crossover – bought",
      body: "Short-term trend crossed above long-term trend. This is a classic buy signal indicating momentum may turn upward."
    },
    mood: "positive"
  },

  TREND_BREAKOUT_BUY: {
    no: {
      title: "Brøt oppover – kjøpte",
      body: "Prisen brøt over en etablert trendlinje. Dette kan signalisere starten på en sterkere oppgang."
    },
    en: {
      title: "Broke upward – bought",
      body: "Price broke above an established trend line. This may signal the start of a stronger uptrend."
    },
    mood: "positive"
  },

  GRID_BUY: {
    no: {
      title: "Kjøpte i grid",
      body: "Prisen falt til et lavere nivå i vårt handelsområde. Grid-strategien kjøper automatisk når prisen går ned og selger når den går opp."
    },
    en: {
      title: "Bought in grid",
      body: "Price dropped to a lower level in our trading range. The grid strategy automatically buys when price goes down and sells when it goes up."
    },
    mood: "neutral"
  },

  DCA_INTERVAL_BUY: {
    no: {
      title: "DCA-kjøp",
      body: "Det er på tide å kjøpe mer ifølge Smart DCA-strategien. Ved å kjøpe litt og litt jevnlig, bygger du posisjon uten å prøve å time markedet."
    },
    en: {
      title: "DCA purchase",
      body: "Time to buy more according to the Smart DCA strategy. By purchasing small amounts regularly, you build your position without trying to time the market."
    },
    mood: "neutral"
  },

  MULTI_SIGNAL_BUY: {
    no: {
      title: "Flere signaler – kjøpte",
      body: "Flere indikatorer pekte i samme retning samtidig. Når mange signaler aligner, øker sannsynligheten for en god trade."
    },
    en: {
      title: "Multiple signals – bought",
      body: "Several indicators pointed in the same direction simultaneously. When many signals align, the probability of a good trade increases."
    },
    mood: "positive"
  },

  MEAN_REVERSION_BUY: {
    no: {
      title: "Kjøpte under normalpris",
      body: "Prisen hadde falt mye på kort tid og var under sin normale pris. Strategien antar at priser gjerne vender tilbake til normalen."
    },
    en: {
      title: "Bought below normal price",
      body: "Price had fallen significantly and was below its normal level. The strategy assumes prices tend to revert to average over time."
    },
    mood: "neutral"
  },

  // SALG-REASONS
  TAKE_PROFIT_SELL: {
    no: {
      title: "Tok gevinst",
      body: "Målprisen ble nådd! Strategien sikret gevinsten som planlagt. Det er alltid vanskelig å vite om man skal holde lenger, men å ta gevinst på planlagte nivåer er god disiplin."
    },
    en: {
      title: "Took profit",
      body: "Target price reached! The strategy secured the profit as planned. It's always hard to know whether to hold longer, but taking profit at planned levels is good discipline."
    },
    mood: "positive"
  },

  STOP_LOSS_SELL: {
    no: {
      title: "Solgte for å beskytte",
      body: "Prisen falt til stoploss-nivået. Dette er risikostyring i praksis: Vi aksepterer et kontrollert tap for å unngå større fall. Selv gode strategier har tapende trades."
    },
    en: {
      title: "Sold to protect",
      body: "Price hit the stop-loss level. This is risk management in practice: We accept a controlled loss to avoid larger drops. Even good strategies have losing trades."
    },
    mood: "negative"
  },

  TRAILING_TP_SELL: {
    no: {
      title: "Sikret gevinsten",
      body: "Prisen falt litt fra toppen, så strategien solgte for å sikre gevinsten. Bedre å ta litt mindre gevinst enn å risikere å miste alt."
    },
    en: {
      title: "Secured the profit",
      body: "Price dropped slightly from the peak, so the strategy sold to lock in profits. Better to take slightly less profit than risk losing it all."
    },
    mood: "positive"
  },

  PARTIAL_TP_SELL: {
    no: {
      title: "Solgte litt – sikret deler",
      body: "Strategien solgte en del av posisjonen for å sikre gevinst, mens resten fortsatt er i markedet. Slik balanserer vi sikkerhet og potensial."
    },
    en: {
      title: "Sold partial – secured some",
      body: "The strategy sold part of the position to lock in profit, while the rest remains in the market. This balances safety and potential."
    },
    mood: "positive"
  },

  TREND_REVERSAL_SELL: {
    no: {
      title: "Trenden snudde – solgte",
      body: "Markedsforholdene endret seg og trenden snudde. Strategien valgte å komme seg ut mens det fortsatt var gevinst."
    },
    en: {
      title: "Trend reversed – sold",
      body: "Market conditions changed and the trend reversed. The strategy chose to exit while there was still profit."
    },
    mood: "warning"
  },

  SMA_CROSSOVER_SELL: {
    no: {
      title: "Krysset under – solgte",
      body: "Korttids-trenden krysset under langtids-trenden. Dette indikerer at momentum kan være i ferd med å snu nedover."
    },
    en: {
      title: "Crossed under – sold",
      body: "Short-term trend crossed below long-term trend. This indicates momentum may be turning downward."
    },
    mood: "warning"
  },

  // RISK/GUARDRAIL BLOCKS
  DAILY_DRAWDOWN_HIT: {
    no: {
      title: "Pauset – tapsgrense nådd",
      body: "Daglig tapsgrense på 2% er nådd. Dette er en innebygd sikkerhet for å unngå større tap på én dag. Trading pauses til i morgen."
    },
    en: {
      title: "Paused – loss limit reached",
      body: "Daily loss limit of 2% has been reached. This is a built-in safety feature to avoid larger losses in one day. Trading pauses until tomorrow."
    },
    mood: "warning"
  },

  EDGE_FILTER_SKIP: {
    no: {
      title: "Ingen trade – for lav forventning",
      body: "Strategien så et signal, men forventet gevinst etter fees var for lav. Vi skipper trades der potensialet ikke er stort nok."
    },
    en: {
      title: "No trade – low expectation",
      body: "The strategy saw a signal, but expected profit after fees was too low. We skip trades where the potential isn't large enough."
    },
    mood: "neutral"
  },

  GLOBAL_RISK_LIMIT_HIT: {
    no: {
      title: "Pauset – total risiko for høy",
      body: "Total risiko på tvers av alle strategier har nådd 2%-grensen. Alle bots pauses for å beskytte total kapital."
    },
    en: {
      title: "Paused – total risk too high",
      body: "Total risk across all strategies has reached the 2% limit. All bots pause to protect overall capital."
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

/**
 * Formater tall på norsk (f.eks. 1250.50 → "1 250,50")
 */
function formatNumber(value: number | undefined | null, locale: Locale, decimals = 2): string {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(locale === "no" ? "nb-NO" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formater prosent på norsk (f.eks. 2.5 → "2,5 %")
 */
function formatPercent(value: number | undefined | null, locale: Locale): string {
  if (value === undefined || value === null) return "-";
  return `${value.toLocaleString(locale === "no" ? "nb-NO" : "en-US", { maximumFractionDigits: 1 })} %`;
}

/**
 * Erstatt placeholders i tekst med faktiske verdier
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
      result = result.replace("{{profit}}", formatPercent(params.profitPct, locale));
    }
    if (params.lossPct !== undefined) {
      result = result.replace("{{loss}}", formatPercent(params.lossPct, locale));
    }
    if (params.rsi !== undefined) {
      result = result.replace("{{rsi}}", Math.round(params.rsi).toString());
    }
    if (params.gridLevel !== undefined) {
      result = result.replace("{{level}}", params.gridLevel.toString());
    }
  }
  
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

/**
 * Generer en brukervennlig forklaring for en trade
 */
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

  // Fallback til UNKNOWN hvis reasonCode mangler
  const code: TradeReasonCode = reasonCode || "UNKNOWN";
  
  // Hent template
  const template = EXPLANATION_TEMPLATES[code] || EXPLANATION_TEMPLATES.UNKNOWN;
  
  // Hent riktig språk
  const localized = template[locale];
  
  // Interpoler med parametere
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

/**
 * Generer forklaring for en liste av trades (timeline)
 */
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

/**
 * Hent mood-basert fargekode for UI
 */
export function getMoodColor(mood: TradeExplanation["mood"]): string {
  switch (mood) {
    case "positive": return "#22c55e"; // green-500
    case "negative": return "#ef4444"; // red-500
    case "warning": return "#f59e0b";  // amber-500
    case "neutral": return "#6b7280";  // gray-500
    default: return "#6b7280";
  }
}

/**
 * Hent mood-basert ikon-navn
 */
export function getMoodIcon(mood: TradeExplanation["mood"]): string {
  switch (mood) {
    case "positive": return "TrendingUp";
    case "negative": return "TrendingDown";
    case "warning": return "AlertTriangle";
    case "neutral": return "Minus";
    default: return "Minus";
  }
}
