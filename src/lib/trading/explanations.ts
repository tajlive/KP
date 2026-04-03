/**
 * Forklaringslag for AI/strategi-data
 * Gjør teknisk trading-informasjon forståelig for norske småsparere
 */

import type { Database } from "@/types/database.types";

export type Locale = "no" | "en";

export type DecisionType = "BUY" | "SELL" | "HOLD";
export type ExitReason = "stoploss" | "take_profit" | "manual" | "signal_reverse" | "signal" | string;
export type StrategyKey = 
  | "sma_crossover" 
  | "breakout" 
  | "mean_reversion" 
  | "trend_following"
  | "grid_trading"
  | "dca_smart"
  | "funding_arbitrage"
  | "sentiment_based"
  | string;

export interface TradeExplanation {
  whyBuy: string;
  whySell: string;
  learnMoreKey?: string;
  learnMoreUrl?: string;
}

export interface AiDecision {
  decision_type?: string;
  decision_reason?: string | null;
  sentiment_score?: number | null;
  sentiment_confidence?: number | null;
  sentiment_recommendation?: string | null;
}

export interface TradeForExplanation {
  side: "buy" | "sell";
  mode: "paper" | "live";
  realized_pnl: number | null;
  exit_reason?: string | null;
  strategy_signal?: Record<string, unknown> | null;
}

// Mapping fra strategi-nøkkel til kursleksjon
const EDUCATION_MAP: Record<string, { no: string; en: string; titleNo: string }> = {
  sma_crossover: {
    no: "/kurs/trading-strategier/leksjon/smart-dca",
    en: "/en/courses/trading-strategies/lesson/smart-dca",
    titleNo: "Smart DCA – Kjøp litt og litt, men smartere",
  },
  trend_following: {
    no: "/leksjon/trender-og-kanaler",
    en: "/en/lessons/trends-and-channels",
    titleNo: "Trender og kanaler",
  },
  breakout: {
    no: "/leksjon/support-og-resistance",
    en: "/en/lessons/support-and-resistance",
    titleNo: "Support og resistance",
  },
  mean_reversion: {
    no: "/kurs/trading-strategier/leksjon/smart-dca",
    en: "/en/courses/trading-strategies/lesson/smart-dca",
    titleNo: "Smart DCA",
  },
  grid_trading: {
    no: "/kurs/trading-strategier/leksjon/grid-trading",
    en: "/en/courses/trading-strategies/lesson/grid-trading",
    titleNo: "Grid Trading – Tjen på sideveis marked",
  },
  dca_smart: {
    no: "/kurs/trading-strategier/leksjon/smart-dca",
    en: "/en/courses/trading-strategies/lesson/smart-dca",
    titleNo: "Smart DCA",
  },
  funding_arbitrage: {
    no: "/kurs/trading-strategier/leksjon/funding-rate-arbitrage",
    en: "/en/courses/trading-strategies/lesson/funding-rate-arbitrage",
    titleNo: "Funding Rate Arbitrage",
  },
  sentiment_based: {
    no: "/leksjon/lese-grafer",
    en: "/en/lessons/reading-charts",
    titleNo: "Lese grafer",
  },
  stoploss: {
    no: "/leksjon/hva-er-stop-loss",
    en: "/en/lessons/what-is-stop-loss",
    titleNo: "Hva er stop-loss?",
  },
  risk_management: {
    no: "/leksjon/posisjonsstorrelse",
    en: "/en/lessons/position-sizing",
    titleNo: "Hvor mye bør du handle?",
  },
};

/**
 * Hent ut strategi-nøkkel fra trade data
 */
function getStrategyKey(trade: TradeForExplanation): StrategyKey {
  const signal = trade.strategy_signal;
  if (!signal) return "sentiment_based";
  
  // Sjekk ulike mulige felter
  const strategyType = (signal.strategy_type as string) || 
                       (signal.strategy_key as string) || 
                       (signal.name as string) ||
                       (signal.type as string);
  
  if (!strategyType) return "sentiment_based";
  
  // Normaliser til kjente nøkler
  const normalized = strategyType.toLowerCase();
  
  if (normalized.includes("dca") || normalized.includes("dollar")) {
    return "dca_smart";
  }
  if (normalized.includes("grid")) {
    return "grid_trading";
  }
  if (normalized.includes("sma") || normalized.includes("crossover") || normalized.includes("moving")) {
    return "sma_crossover";
  }
  if (normalized.includes("trend")) {
    return "trend_following";
  }
  if (normalized.includes("breakout") || normalized.includes("break")) {
    return "breakout";
  }
  if (normalized.includes("mean") || normalized.includes("reversion")) {
    return "mean_reversion";
  }
  if (normalized.includes("funding") || normalized.includes("arbitrage")) {
    return "funding_arbitrage";
  }
  
  return "sentiment_based";
}

/**
 * Hent ut exit-årsak fra trade data
 */
function getExitReason(trade: TradeForExplanation): ExitReason {
  if (trade.exit_reason) {
    const reason = trade.exit_reason.toLowerCase();
    if (reason.includes("stoploss") || reason.includes("stop_loss")) return "stoploss";
    if (reason.includes("takeprofit") || reason.includes("take_profit")) return "take_profit";
    if (reason.includes("manual")) return "manual";
    if (reason.includes("reverse") || reason.includes("signal")) return "signal_reverse";
    return reason;
  }
  
  // Fallback: hvis det er et salg med negativ PnL, anta stoploss
  if (trade.side === "sell" && trade.realized_pnl !== null && trade.realized_pnl < 0) {
    return "stoploss";
  }
  
  return "signal";
}

/**
 * Bygg forklaring for kjøp (whyBuy)
 */
function buildBuyExplanation(
  trade: TradeForExplanation, 
  decision: AiDecision | null, 
  locale: Locale
): string {
  if (locale === "en") {
    return buildBuyExplanationEn(trade, decision);
  }
  
  const strategyKey = getStrategyKey(trade);
  const confidence = decision?.sentiment_confidence ?? (decision?.sentiment_score ? decision.sentiment_score / 100 : null);
  
  // Basert på strategi-type
  switch (strategyKey) {
    case "dca_smart":
      return "Vi kjøpte fordi markedet var i en god kjøpsfase ifølge vår Smart DCA-strategi. Ved å kjøpe litt og litt når prisen er lav, bygger du posisjon gradvis uten å prøve å time markedet perfekt.";
    
    case "grid_trading":
      return "Vi kjøpte fordi prisen falt til et lavere nivå i vårt grid. Grid-strategien kjøper automatisk når prisen går ned og selger når den går opp – perfekt for sideveis marked.";
    
    case "sma_crossover":
      return "Vi kjøpte fordi korttids-trenden krysset over langtids-trenden. Dette indikerer at momentum kan være i ferd med å snu til det positive.";
    
    case "trend_following":
      return "Vi kjøpte fordi prisen brøt over en etablert trendlinje oppover. Strategien følger med på momentum og handler i retning av den sterkeste bevegelsen.";
    
    case "breakout":
      return "Vi kjøpte fordi prisen brøt over et viktig motstandsnivå (resistance). Dette kan signalisere starten på en ny oppgang.";
    
    case "mean_reversion":
      return "Vi kjøpte fordi prisen hadde falt mye på kort tid og var under sin historiske gjennomsnittspris. Strategien antar at priser gjerne vender tilbake til normalen etter store utsving.";
    
    case "funding_arbitrage":
      return "Vi kjøpte spot og solgte futures for å utnytte en gunstig funding rate. Dette er en markednøytral strategi som tjener på renteforskjeller, ikke prisbevegelse.";
    
    default:
      // Fallback basert på confidence
      if (confidence && confidence > 0.7) {
        return "Vi kjøpte fordi AI-en vår oppdaget sterke positive signaler i markedet. Konfidensen var høy, så strategien valgte å gå inn i en posisjon.";
      } else if (confidence && confidence > 0.4) {
        return "Vi kjøpte fordi flere signaler pekte i positiv retning. Konfidensen var moderat, men nok til å åpne en mindre posisjon.";
      } else {
        return "Vi kjøpte basert på en kombinasjon av tekniske indikatorer og markedssentiment. Strategien vurderte dette som et passende tidspunkt å gå inn.";
      }
  }
}

function buildBuyExplanationEn(trade: TradeForExplanation, decision: AiDecision | null): string {
  const strategyKey = getStrategyKey(trade);
  const confidence = decision?.sentiment_confidence ?? (decision?.sentiment_score ? decision.sentiment_score / 100 : null);
  
  switch (strategyKey) {
    case "dca_smart":
      return "We bought because the market was in a good buying phase according to our Smart DCA strategy. By purchasing gradually when prices are low, you build your position without trying to perfectly time the market.";
    case "grid_trading":
      return "We bought because the price dropped to a lower level in our grid. The grid strategy automatically buys when price goes down and sells when it goes up – perfect for sideways markets.";
    case "sma_crossover":
      return "We bought because the short-term trend crossed above the long-term trend. This indicates momentum may be turning positive.";
    case "trend_following":
      return "We bought because the price broke above an established upward trend line. The strategy follows momentum and trades in the direction of the strongest movement.";
    case "breakout":
      return "We bought because the price broke above a key resistance level. This could signal the start of a new uptrend.";
    default:
      if (confidence && confidence > 0.7) {
        return "We bought because our AI detected strong positive signals in the market. Confidence was high, so the strategy chose to enter a position.";
      }
      return "We bought based on a combination of technical indicators and market sentiment. The strategy evaluated this as an appropriate time to enter.";
  }
}

/**
 * Bygg forklaring for salg (whySell)
 */
function buildSellExplanation(
  trade: TradeForExplanation, 
  decision: AiDecision | null, 
  locale: Locale
): string {
  if (locale === "en") {
    return buildSellExplanationEn(trade, decision);
  }
  
  const exitReason = getExitReason(trade);
  const pnl = trade.realized_pnl ?? 0;
  
  switch (exitReason) {
    case "stoploss":
      if (pnl < -500) {
        return "Vi solgte fordi prisen falt under stoploss-grensen du har satt. Dette er risikostyring i praksis: Vi aksepterer et kontrollert tap for å unngå større fall. Selv gode strategier har tapende trades – det viktige er at tapene er små mens gevinstene er større.";
      }
      return "Vi solgte fordi prisen falt til stoploss-nivået. Slik beskytter vi kapitalen mot større tap.";
    
    case "take_profit":
      return "Vi solgte fordi målprisen (take profit) ble nådd. Strategien sikret gevinsten slik den var planlagt. Det er alltid vanskelig å vite om man skal holde lenger, men å ta gevinst på planlagte nivåer er god disiplin.";
    
    case "manual":
      return "Du valgte å selge manuelt. Strategien ble overstyrt av deg – dette gir deg full kontroll når du vil ta gevinst eller cut losses.";
    
    case "signal_reverse":
      return "Strategien ga et nytt salgssignal basert på endrede markedsforhold. Noen ganger er det bedre å komme seg ut når vinden snur, selv om det betyr å ta mindre gevinst enn håpet.";
    
    default:
      if (pnl > 0) {
        return "Vi solgte for å sikre en gevinst på " + Math.round(pnl).toLocaleString("nb-NO") + " kr. Strategien vurderte at risikoen for tilbakeslag nå oversteg potensialet for videre oppgang.";
      } else if (pnl < 0) {
        return "Vi solgte for å begrense tapet. Strategien vurderte at videre nedgang var mer sannsynlig enn oppgang, og valgte å komme seg ut før tapet ble større.";
      }
      return "Posisjonen ble lukket basert på strategiens salgskriterier.";
  }
}

function buildSellExplanationEn(trade: TradeForExplanation, decision: AiDecision | null): string {
  const exitReason = getExitReason(trade);
  const pnl = trade.realized_pnl ?? 0;
  
  switch (exitReason) {
    case "stoploss":
      if (pnl < -500) {
        return "We sold because the price fell below your stop-loss limit. This is risk management in practice: We accept a controlled loss to avoid larger drops. Even good strategies have losing trades – what matters is that losses are small while gains are larger.";
      }
      return "We sold because the price hit the stop-loss level. This protects capital from larger losses.";
    case "take_profit":
      return "We sold because the take-profit target was reached. The strategy secured the profit as planned. It's always hard to know whether to hold longer, but taking profit at planned levels is good discipline.";
    case "manual":
      return "You chose to sell manually. The strategy was overridden by you – this gives you full control when you want to take profit or cut losses.";
    default:
      if (pnl > 0) {
        return "We sold to secure a profit of " + Math.round(pnl).toLocaleString("en-US") + ". The strategy assessed that the risk of pullback now exceeded the potential for further gains.";
      }
      return "Position was closed based on the strategy's sell criteria.";
  }
}

/**
 * Hent ut læringsressurs basert på strategi og exit-årsak
 */
function getLearnMoreKey(trade: TradeForExplanation): string | undefined {
  const exitReason = getExitReason(trade);
  const strategyKey = getStrategyKey(trade);
  
  // Prioriter exit-relatert læring hvis det var et tap med stoploss
  if (exitReason === "stoploss" && (trade.realized_pnl ?? 0) < 0) {
    return "stoploss";
  }
  
  // Ellers bruk strategi-basert læring
  return strategyKey;
}

/**
 * Hent URL til læringsressurs
 */
function getLearnMoreUrl(key: string | undefined, locale: Locale): string | undefined {
  if (!key) return undefined;
  
  const resource = EDUCATION_MAP[key];
  if (!resource) return undefined;
  
  return locale === "en" ? resource.en : resource.no;
}

/**
 * Hovedfunksjon: Bygg komplett forklaring for en trade
 */
export function buildTradeExplanation(
  trade: TradeForExplanation,
  decision: AiDecision | null,
  locale: Locale = "no"
): TradeExplanation {
  const whyBuy = buildBuyExplanation(trade, decision, locale);
  const whySell = buildSellExplanation(trade, decision, locale);
  const learnMoreKey = getLearnMoreKey(trade);
  const learnMoreUrl = getLearnMoreUrl(learnMoreKey, locale);
  
  return {
    whyBuy,
    whySell,
    learnMoreKey,
    learnMoreUrl,
  };
}

/**
 * Hent tittel på læringsressurs
 */
export function getLearnMoreTitle(key: string | undefined, locale: Locale = "no"): string {
  if (!key) return "";
  const resource = EDUCATION_MAP[key];
  if (!resource) return "";
  return locale === "en" ? resource.titleNo : resource.titleNo;
}

/**
 * Sjekk om trade er i paper-modus (for visning)
 */
export function getPaperModeNotice(locale: Locale = "no"): string {
  return locale === "en" 
    ? "This is a simulated trade (paper trading). No real money was used."
    : "Dette er en simulert handel (lekepenger). Ingen ekte penger er brukt.";
}
