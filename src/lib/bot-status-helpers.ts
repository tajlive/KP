/**
 * Bot Status Helpers - KLA-100
 * Hjelpefunksjoner for å generere "siste handling" og "neste handling" tekst
 */

import { Trade, UserStrategy } from "./trading-api";

export interface BotStatusMessage {
  lastActionText: string;
  lastActionTimestamp: Date | null;
  nextActionText: string;
  nextActionTime: Date | null;
  statusExplanation: string;
  explanation?: string;  // Optional explanation for AI decisions
}

/**
 * Formaterer en timestamp til "for X minutter siden" format
 */
export function formatTimeAgo(date: Date | string | null, locale: string = "no"): string {
  if (!date) return "Ukjent tid";
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === "en") {
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  // Norwegian (default)
  if (diffMins < 1) return "akkurat nå";
  if (diffMins < 60) return `for ${diffMins} minutt${diffMins > 1 ? "er" : ""} siden`;
  if (diffHours < 24) return `for ${diffHours} time${diffHours > 1 ? "r" : ""} siden`;
  return `for ${diffDays} dag${diffDays > 1 ? "er" : ""} siden`;
}

/**
 * Formaterer tid til fremtidig handling
 */
export function formatTimeUntil(date: Date | string | null, locale: string = "no"): string {
  if (!date) return "Ukjent";
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = then.getTime() - now.getTime();
  
  if (diffMs <= 0) return locale === "en" ? "Any moment now" : "Når som helst";
  
  const diffMins = Math.ceil(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (locale === "en") {
    if (diffMins < 60) return `in ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  }

  if (diffMins < 60) return `om ${diffMins} minutt${diffMins > 1 ? "er" : ""}`;
  return `om ${diffHours} time${diffHours > 1 ? "r" : ""}`;
}

/**
 * Genererer forklarende tekst basert på trading signal
 */
function getSignalExplanation(
  signal: string | undefined,
  indicators: Record<string, unknown> | undefined,
  locale: string = "no"
): string {
  const explanations: Record<string, Record<string, string>> = {
    no: {
      rsi_oversold: "RSI var oversolgt",
      rsi_overbought: "RSI var overkjøpt",
      ma_crossover: "MA crossover signal",
      breakout: "Breakout oppdaget",
      dca_trigger: "DCA-intervall nådd",
      grid_buy: "Grid kjøpsnivå nådd",
      grid_sell: "Grid salgsnivå nådd",
      trend_following: "Trend-følging signal",
      ai_signal: "AI signal",
      volume_spike: "Volumspike oppdaget",
      support_bounce: "Støttenivå bounce",
      resistance_break: "Motstandsnivå brutt",
    },
    en: {
      rsi_oversold: "RSI was oversold",
      rsi_overbought: "RSI was overbought",
      ma_crossover: "MA crossover signal",
      breakout: "Breakout detected",
      dca_trigger: "DCA interval reached",
      grid_buy: "Grid buy level reached",
      grid_sell: "Grid sell level reached",
      trend_following: "Trend following signal",
      ai_signal: "AI signal",
      volume_spike: "Volume spike detected",
      support_bounce: "Support level bounce",
      resistance_break: "Resistance level broken",
    },
  };

  const lang = locale === "en" ? "en" : "no";
  
  // Sjekk signal først
  if (signal && explanations[lang][signal]) {
    return explanations[lang][signal];
  }
  
  // Sjekk indicators
  if (indicators?.rsi !== undefined) {
    const rsi = Number(indicators.rsi);
    if (rsi < 30) return explanations[lang].rsi_oversold;
    if (rsi > 70) return explanations[lang].rsi_overbought;
  }
  
  if (indicators?.dca_interval) {
    return explanations[lang].dca_trigger;
  }
  
  return locale === "en" ? "Signal detected" : "Signal oppdaget";
}

/**
 * Genererer "siste handling" tekst
 */
export function generateLastActionText(
  lastTrade: Trade | null,
  locale: string = "no"
): { text: string; timestamp: Date | null; explanation: string } {
  if (!lastTrade) {
    return {
      text: locale === "en" ? "No trades yet" : "Ingen handler ennå",
      timestamp: null,
      explanation: locale === "en" 
        ? "Waiting for the first signal" 
        : "Venter på første signal",
    };
  }

  const symbol = (lastTrade as unknown as { trading_pair?: string }).trading_pair || lastTrade.symbol;
  const side = lastTrade.side === "buy" 
    ? (locale === "en" ? "Bought" : "Kjøpte") 
    : (locale === "en" ? "Sold" : "Solgte");
  const amount = lastTrade.total_value 
    ? `${Math.round(lastTrade.total_value).toLocaleString(locale === "en" ? "en-US" : "no-NO")} kr`
    : "";
  
  const signal = lastTrade.strategy_signal as { signal?: string; indicators?: Record<string, unknown> } | undefined;
  const explanation = getSignalExplanation(
    signal?.signal,
    signal?.indicators,
    locale
  );

  const timeAgo = formatTimeAgo(lastTrade.executed_at || lastTrade.created_at, locale);

  return {
    text: `${side} ${symbol} ${amount ? `for ${amount}` : ""} – ${timeAgo}`,
    timestamp: new Date(lastTrade.executed_at || lastTrade.created_at),
    explanation,
  };
}

/**
 * Genererer "neste handling" tekst basert på strategi og markedsforhold
 */
export function generateNextActionText(
  strategy: UserStrategy | null,
  locale: string = "no",
  marketCondition?: "normal" | "volatile" | "trending_up" | "trending_down"
): { text: string; nextCheckTime: Date; explanation: string } {
  const now = new Date();
  
  if (!strategy) {
    const nextCheck = new Date(now.getTime() + 5 * 60000); // 5 min
    return {
      text: locale === "en" ? "Scanning market..." : "Scanner markedet...",
      nextCheckTime: nextCheck,
      explanation: locale === "en" 
        ? "Checking for opportunities every 5 minutes" 
        : "Sjekker etter muligheter hvert 5. minutt",
    };
  }

  // Beregn neste sjekk basert på strategi-type
  let checkIntervalMinutes = 15; // default
  const actionText = "";
  const explanation = "";

  const strategyId = strategy.strategy_id;
  const lang = locale === "en" ? "en" : "no";

  const texts: Record<string, Record<string, { action: string; explanation: string }>> = {
    no: {
      dca_trygg: {
        action: "Neste DCA-kjøp",
        explanation: "Kjøper fast beløp hver uke automatisk",
      },
      trend_balansert: {
        action: "Sjekker trend-signaler",
        explanation: "Venter på MA crossover eller RSI signal",
      },
      multisignal_aktiv: {
        action: "Multi-signal analyse",
        explanation: "Kombinerer RSI, MACD og volum for best signal",
      },
      grid_bot: {
        action: "Overvåker grid-nivåer",
        explanation: "Kjøper ved støtte, selger ved motstand",
      },
      ai_copy: {
        action: "AI-evaluerer markedet",
        explanation: "AI analyserer topp-traderes strategier",
      },
    },
    en: {
      dca_trygg: {
        action: "Next DCA purchase",
        explanation: "Buys fixed amount weekly automatically",
      },
      trend_balansert: {
        action: "Checking trend signals",
        explanation: "Waiting for MA crossover or RSI signal",
      },
      multisignal_aktiv: {
        action: "Multi-signal analysis",
        explanation: "Combining RSI, MACD and volume for best signal",
      },
      grid_bot: {
        action: "Monitoring grid levels",
        explanation: "Buying at support, selling at resistance",
      },
      ai_copy: {
        action: "AI evaluating market",
        explanation: "AI analyzes top traders' strategies",
      },
    },
  };

  // Juster intervall basert på strategi
  if (strategyId.includes("dca")) {
    checkIntervalMinutes = 60; // Hver time for DCA
  } else if (strategyId.includes("multi") || strategyId.includes("aktiv")) {
    checkIntervalMinutes = 5; // Hver 5. min for aktiv
  } else if (strategyId.includes("grid")) {
    checkIntervalMinutes = 3; // Hver 3. min for grid
  } else if (strategyId.includes("ai")) {
    checkIntervalMinutes = 10; // Hver 10. min for AI
  } else {
    checkIntervalMinutes = 15; // Standard
  }

  // Juster for markedsforhold
  if (marketCondition === "volatile") {
    checkIntervalMinutes = Math.max(2, Math.floor(checkIntervalMinutes / 2));
  }

  const strategyTexts = texts[lang][strategyId] || {
    action: lang === "en" ? "Scanning market" : "Scanner markedet",
    explanation: lang === "en" ? "Analyzing market conditions" : "Analyserer markedsforhold",
  };

  const nextCheck = new Date(now.getTime() + checkIntervalMinutes * 60000);

  return {
    text: strategyTexts.action,
    nextCheckTime: nextCheck,
    explanation: strategyTexts.explanation,
  };
}

/**
 * Hovedfunksjon som genererer komplett bot-status melding
 */
export function generateBotStatusMessage(
  lastTrade: Trade | null,
  activeStrategy: UserStrategy | null,
  locale: string = "no",
  marketCondition?: "normal" | "volatile" | "trending_up" | "trending_down"
): BotStatusMessage {
  const lastAction = generateLastActionText(lastTrade, locale);
  const nextAction = generateNextActionText(activeStrategy, locale, marketCondition);

  return {
    lastActionText: lastAction.text,
    lastActionTimestamp: lastAction.timestamp,
    nextActionText: nextAction.text,
    nextActionTime: nextAction.nextCheckTime,
    statusExplanation: nextAction.explanation,
  };
}

/**
 * Sjekker om bruker er "ny" (færre enn 3 handler eller ingen aktive strategier)
 */
export function isNewUser(
  trades: Trade[],
  activeStrategies: UserStrategy[],
  onboardingCompleted?: boolean
): boolean {
  if (onboardingCompleted === false) return true;
  if (activeStrategies.length === 0) return true;
  if (trades.length < 3) return true;
  return false;
}
