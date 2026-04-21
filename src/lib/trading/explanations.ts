/**
 * Forklaringslag for AI/strategi-data
 * Gjør teknisk trading-informasjon forståelig for norske småsparere
 * 
 * NYTT 2026-04-21: Utvidet med indikator-kontekst, P&L-detaljer,
 * og dynamiske forklaringer basert på faktiske trade-data.
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
  price?: number;
  quantity?: number;
  total_value?: number;
  fee?: number;
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

function getStrategyKey(trade: TradeForExplanation): StrategyKey {
  const signal = trade.strategy_signal;
  if (!signal) return "sentiment_based";
  
  const strategyType = (signal.strategy_type as string) || 
                       (signal.strategy_key as string) || 
                       (signal.name as string) ||
                       (signal.type as string);
  
  if (!strategyType) return "sentiment_based";
  
  const normalized = strategyType.toLowerCase();
  
  if (normalized.includes("dca") || normalized.includes("dollar")) return "dca_smart";
  if (normalized.includes("grid")) return "grid_trading";
  if (normalized.includes("sma") || normalized.includes("crossover") || normalized.includes("moving")) return "sma_crossover";
  if (normalized.includes("trend")) return "trend_following";
  if (normalized.includes("breakout") || normalized.includes("break")) return "breakout";
  if (normalized.includes("mean") || normalized.includes("reversion")) return "mean_reversion";
  if (normalized.includes("funding") || normalized.includes("arbitrage")) return "funding_arbitrage";
  
  return "sentiment_based";
}

function getExitReason(trade: TradeForExplanation): ExitReason {
  if (trade.exit_reason) {
    const reason = trade.exit_reason.toLowerCase();
    if (reason.includes("stoploss") || reason.includes("stop_loss")) return "stoploss";
    if (reason.includes("takeprofit") || reason.includes("take_profit")) return "take_profit";
    if (reason.includes("manual")) return "manual";
    if (reason.includes("reverse") || reason.includes("signal")) return "signal_reverse";
    return reason;
  }
  
  if (trade.side === "sell" && trade.realized_pnl !== null && trade.realized_pnl < 0) {
    return "stoploss";
  }
  
  return "signal";
}

function formatNOK(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "-";
  const abs = Math.abs(value);
  const prefix = value < 0 ? "−" : "+";
  return `${prefix}${abs.toLocaleString(locale === "no" ? "nb-NO" : "en-US", { maximumFractionDigits: 0 })} kr`;
}

function formatPercent(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString(locale === "no" ? "nb-NO" : "en-US", { maximumFractionDigits: 1 })}%`;
}

function getIndicatorContext(signal: Record<string, unknown> | null | undefined, locale: Locale): string {
  if (!signal) return "";
  
  const parts: string[] = [];
  
  if (signal.rsi !== undefined) {
    const rsi = Number(signal.rsi);
    const state = rsi < 30 ? "underkjøpt" : rsi > 70 ? "overkjøpt" : "nøytral";
    parts.push(locale === "en" ? `RSI: ${Math.round(rsi)} (${state})` : `RSI: ${Math.round(rsi)} (${state})`);
  }
  
  if (signal.sma20 !== undefined && signal.sma50 !== undefined) {
    const diff = ((Number(signal.sma20) - Number(signal.sma50)) / Number(signal.sma50)) * 100;
    const direction = diff > 0 ? "over" : "under";
    parts.push(locale === "en" 
      ? `SMA20 is ${formatPercent(Math.abs(diff), locale)} ${direction} SMA50`
      : `SMA20 ligger ${formatPercent(Math.abs(diff), locale)} ${direction} SMA50`);
  }
  
  if (signal.confidence !== undefined) {
    parts.push(locale === "en"
      ? `Confidence: ${Math.round(Number(signal.confidence))}%`
      : `Konfidens: ${Math.round(Number(signal.confidence))}%`);
  }
  
  if (signal.grid_level !== undefined) {
    parts.push(locale === "en"
      ? `Grid level: ${signal.grid_level}`
      : `Grid-nivå: ${signal.grid_level}`);
  }
  
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

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
  const indicatorCtx = getIndicatorContext(trade.strategy_signal, locale);
  const price = trade.price ? ` til ${Math.round(trade.price).toLocaleString("nb-NO")} kr` : "";
  const size = trade.total_value ? ` for ${Math.round(trade.total_value).toLocaleString("nb-NO")} kr` : "";
  
  switch (strategyKey) {
    case "dca_smart":
      return `Vi kjøpte${size}${price} fordi Smart DCA-strategien indikerte at det var en god kjøpsfase${indicatorCtx}. Ved å kjøpe litt og litt når prisen er gunstig, bygger du posisjon gradvis uten å prøve å time markedet perfekt.`;
    
    case "grid_trading":
      return `Vi kjøpte${size}${price} fordi prisen falt til et lavere nivå i vårt grid${indicatorCtx}. Grid-strategien kjøper automatisk når prisen går ned og selger når den går opp – perfekt for sideveis marked.`;
    
    case "sma_crossover":
      return `Vi kjøpte${size}${price} fordi korttids-trenden krysset over langtids-trenden${indicatorCtx}. Dette «golden cross»-signalet indikerer at momentum snur til det positive.`;
    
    case "trend_following":
      return `Vi kjøpte${size}${price} fordi prisen brøt over en etablert trendlinje oppover${indicatorCtx}. Strategien følger momentum og handler i retning av den sterkeste bevegelsen.`;
    
    case "breakout":
      return `Vi kjøpte${size}${price} fordi prisen brøt over et viktig motstandsnivå${indicatorCtx}. Breakout-signalet kan markere starten på en ny oppgang.`;
    
    case "mean_reversion":
      return `Vi kjøpte${size}${price} fordi prisen hadde falt betydelig under sin historiske gjennomsnittspris${indicatorCtx}. Strategien antar at priser gjerne vender tilbake til normalen etter store utsving.`;
    
    case "funding_arbitrage":
      return `Vi kjøpte spot og solgte futures${size} for å utnytte en gunstig funding rate. Dette er en markednøytral strategi som tjener på renteforskjeller, ikke prisbevegelse.`;
    
    default:
      if (confidence && confidence > 0.7) {
        return `Vi kjøpte${size}${price} fordi AI-ensemblet vårt oppdaget sterke positive signaler i markedet${indicatorCtx}. Konfidensen var ${Math.round(confidence * 100)}%, så strategien valgte å gå inn i en posisjon.`;
      } else if (confidence && confidence > 0.4) {
        return `Vi kjøpte${size}${price} fordi flere signaler pekte i positiv retning${indicatorCtx}. Konfidensen var ${Math.round(confidence * 100)}%, nok til å åpne en mindre posisjon.`;
      } else {
        return `Vi kjøpte${size}${price} basert på en kombinasjon av tekniske indikatorer og markedssentiment${indicatorCtx}. Strategien vurderte dette som et passende tidspunkt å gå inn.`;
      }
  }
}

function buildBuyExplanationEn(trade: TradeForExplanation, decision: AiDecision | null): string {
  const strategyKey = getStrategyKey(trade);
  const confidence = decision?.sentiment_confidence ?? (decision?.sentiment_score ? decision.sentiment_score / 100 : null);
  const indicatorCtx = getIndicatorContext(trade.strategy_signal, "en");
  const price = trade.price ? ` at ${Math.round(trade.price).toLocaleString("en-US")}` : "";
  const size = trade.total_value ? ` for ${Math.round(trade.total_value).toLocaleString("en-US")}` : "";
  
  switch (strategyKey) {
    case "dca_smart":
      return `We bought${size}${price} because the Smart DCA strategy indicated a good buying phase${indicatorCtx}. By purchasing gradually when prices are favorable, you build your position without trying to perfectly time the market.`;
    case "grid_trading":
      return `We bought${size}${price} because the price dropped to a lower level in our grid${indicatorCtx}. The grid strategy automatically buys when price goes down and sells when it goes up.`;
    case "sma_crossover":
      return `We bought${size}${price} because the short-term trend crossed above the long-term trend${indicatorCtx}. This 'golden cross' signal indicates momentum may be turning positive.`;
    case "trend_following":
      return `We bought${size}${price} because the price broke above an established trend line${indicatorCtx}. The strategy follows momentum and trades in the direction of the strongest movement.`;
    case "breakout":
      return `We bought${size}${price} because the price broke above a key resistance level${indicatorCtx}. This breakout signal may mark the start of a new uptrend.`;
    default:
      if (confidence && confidence > 0.7) {
        return `We bought${size}${price} because our AI ensemble detected strong positive signals${indicatorCtx}. Confidence was ${Math.round(confidence * 100)}%, so the strategy chose to enter a position.`;
      }
      return `We bought${size}${price} based on a combination of technical indicators and market sentiment${indicatorCtx}. The strategy evaluated this as an appropriate time to enter.`;
  }
}

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
  const pnlStr = formatNOK(pnl, locale);
  const price = trade.price ? ` til ${Math.round(trade.price).toLocaleString("nb-NO")} kr` : "";
  const indicatorCtx = getIndicatorContext(trade.strategy_signal, locale);
  
  switch (exitReason) {
    case "stoploss":
      if (pnl < -500) {
        return `Vi solgte${price} fordi prisen falt under stoploss-grensen. Risikostyring i praksis: Vi aksepterte et tap på ${pnlStr} for å unngå større fall. Selv gode strategier har tapende trades – det viktige er at tapene er små mens gevinstene er større.`;
      }
      return `Vi solgte${price} fordi prisen falt til stoploss-nivået${indicatorCtx}. Slik beskytter vi kapitalen mot større tap. Resultat: ${pnlStr}.`;
    
    case "take_profit":
      return `Vi solgte${price} fordi målprisen ble nådd${indicatorCtx}. Strategien sikret ${pnlStr} i gevinst. Å ta gevinst på planlagte nivåer er god disiplin.`;
    
    case "manual":
      return `Du valgte å selge manuelt${price}. Strategien ble overstyrt av deg – dette gir deg full kontroll. Resultat: ${pnlStr}.`;
    
    case "signal_reverse":
      return `Strategien ga et nytt salgssignal${indicatorCtx}${price}. Markedsforholdene hadde endret seg, og det var bedre å komme seg ut med ${pnlStr} enn å risikere større tap.`;
    
    default:
      if (pnl > 0) {
        return `Vi solgte${price} for å sikre ${pnlStr} i gevinst${indicatorCtx}. Strategien vurderte at risikoen for tilbakeslag nå oversteg potensialet for videre oppgang.`;
      } else if (pnl < 0) {
        return `Vi solgte${price} for å begrense tapet til ${pnlStr}${indicatorCtx}. Strategien vurderte at videre nedgang var mer sannsynlig enn oppgang.`;
      }
      return `Posisjonen ble lukket${price} basert på strategiens salgskriterier${indicatorCtx}.`;
  }
}

function buildSellExplanationEn(trade: TradeForExplanation, decision: AiDecision | null): string {
  const exitReason = getExitReason(trade);
  const pnl = trade.realized_pnl ?? 0;
  const pnlStr = formatNOK(pnl, "en");
  const price = trade.price ? ` at ${Math.round(trade.price).toLocaleString("en-US")}` : "";
  const indicatorCtx = getIndicatorContext(trade.strategy_signal, "en");
  
  switch (exitReason) {
    case "stoploss":
      if (pnl < -500) {
        return `We sold${price} because the price fell below the stop-loss limit. Risk management in practice: We accepted a loss of ${pnlStr} to avoid larger drops. Even good strategies have losing trades – what matters is that losses are small while gains are larger.`;
      }
      return `We sold${price} because the price hit the stop-loss level${indicatorCtx}. This protects capital from larger losses. Result: ${pnlStr}.`;
    case "take_profit":
      return `We sold${price} because the take-profit target was reached${indicatorCtx}. The strategy secured ${pnlStr} in profit. Taking profit at planned levels is good discipline.`;
    case "manual":
      return `You chose to sell manually${price}. The strategy was overridden by you – this gives you full control. Result: ${pnlStr}.`;
    default:
      if (pnl > 0) {
        return `We sold${price} to secure ${pnlStr} in profit${indicatorCtx}. The strategy assessed that the risk of pullback now exceeded the potential for further gains.`;
      } else if (pnl < 0) {
        return `We sold${price} to limit the loss to ${pnlStr}${indicatorCtx}. The strategy assessed that further decline was more likely than recovery.`;
      }
      return `Position was closed${price} based on the strategy's sell criteria${indicatorCtx}.`;
  }
}

function getLearnMoreKey(trade: TradeForExplanation): string | undefined {
  const exitReason = getExitReason(trade);
  const strategyKey = getStrategyKey(trade);
  
  if (exitReason === "stoploss" && (trade.realized_pnl ?? 0) < 0) {
    return "stoploss";
  }
  
  return strategyKey;
}

function getLearnMoreUrl(key: string | undefined, locale: Locale): string | undefined {
  if (!key) return undefined;
  
  const resource = EDUCATION_MAP[key];
  if (!resource) return undefined;
  
  return locale === "en" ? resource.en : resource.no;
}

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

export function getLearnMoreTitle(key: string | undefined, locale: Locale = "no"): string {
  if (!key) return "";
  const resource = EDUCATION_MAP[key];
  if (!resource) return "";
  return resource.titleNo;
}

export function getPaperModeNotice(locale: Locale = "no"): string {
  return locale === "en" 
    ? "This is a simulated trade (paper trading). No real money was used."
    : "Dette er en simulert handel (lekepenger). Ingen ekte penger er brukt.";
}
