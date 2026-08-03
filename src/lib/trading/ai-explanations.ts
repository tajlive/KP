/**
 * AI Trade Explanations — LLM-genererte forklaringer per trade
 *
 * Genererer korte, engasjerende norske forklaringer på hvert trade
 * ved hjelp av DeepSeek (billig) eller Kimi (fallback).
 *
 * Design-mål:
 * - Maks 3 setninger — skal kunne leses på 5 sekunder
 * - Konkret: nevne faktiske tall (RSI, grid-nivå, pris)
 * - Lærerik: forklar HVORFOR, ikke bare HVA
 * - Rolig tone: ingen hype, ingen gevinstløfter
 *
 * Kostnad: ~$0.0001 per forklaring med DeepSeek V4 (200 token output).
 *
 * @module trading/ai-explanations
 */

import { chatWithAI, type AIResponse } from "@/lib/ai/providers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeContext {
  symbol: string;
  side: "buy" | "sell";
  priceNok: number;
  amountNok: number;
  strategy: string;
  reason?: string;
  indicators?: {
    rsi?: number;
    macd_histogram?: number;
    regime?: string;
    grid_level?: number;
    grid_total?: number;
    buy_price?: number;
    sell_price?: number;
    profit_pct?: number;
    confidence?: number;
    ensemble_score?: number;
  };
}

export interface ExplanationResult {
  /** Kort, engasjerende forklaring (maks 3 setninger) */
  text: string;
  /** Hvor forklaringen kom fra */
  source: "llm" | "template";
  /** Tokens brukt (for kostnadssporing) */
  tokens?: number;
  /** Latency i ms */
  latencyMs?: number;
}

// ---------------------------------------------------------------------------
// Prompt-bygging
// ---------------------------------------------------------------------------

function buildPrompt(ctx: TradeContext): string {
  const parts: string[] = [];

  parts.push(`Du er en rolig, kunnskapsrik norsk trading-assistent.`);
  parts.push(`Forklar dette ${ctx.side === "buy" ? "kjøpet" : "salget"} til en nybegynner på MAKS 2-3 korte setninger.`);
  parts.push(``);
  parts.push(`Fakta:`);
  parts.push(`- ${ctx.side === "buy" ? "Kjøpte" : "Solgte"} ${ctx.amountNok.toFixed(0)} kr ${ctx.symbol.replace("USDT", "")} til ${ctx.priceNok.toFixed(2)} kr`);

  if (ctx.strategy === "grid") {
    parts.push(`- Strategi: Grid trading (kjøper lavt, selger høyt i et prisintervall)`);
    if (ctx.indicators?.grid_level !== undefined) {
      parts.push(`- Grid-nivå: ${ctx.indicators.grid_level} av ${ctx.indicators.grid_total ?? 20}`);
    }
    if (ctx.indicators?.buy_price && ctx.indicators?.sell_price) {
      parts.push(`- Kjøpspris: ${ctx.indicators.buy_price.toFixed(2)}, mål-salg: ${ctx.indicators.sell_price.toFixed(2)}`);
    }
    if (ctx.indicators?.profit_pct) {
      parts.push(`- Forventet gevinst ved salg: +${ctx.indicators.profit_pct.toFixed(1)}%`);
    }
  }

  if (ctx.indicators?.rsi !== undefined) {
    parts.push(`- RSI: ${ctx.indicators.rsi.toFixed(0)} ${ctx.indicators.rsi < 30 ? "(oversolgt)" : ctx.indicators.rsi > 70 ? "(overkjøpt)" : "(nøytral)"}`);
  }

  if (ctx.indicators?.regime) {
    parts.push(`- Markedsregime: ${ctx.indicators.regime}`);
  }

  if (ctx.reason) {
    parts.push(`- Signal: ${ctx.reason}`);
  }

  parts.push(``);
  parts.push(`Regler:`);
  parts.push(`- Norsk bokmål, enkel og vennlig tone`);
  parts.push(`- Nevn de viktigste tallene konkret`);
  parts.push(`- Forklar HVORFOR dette er et godt valg (eller hvorfor det er risikabelt)`);
  parts.push(`- Ingen gevinstløfter, ingen hype — vær ærlig om risiko`);
  parts.push(`- Start ikke med "Jeg" — start med handlingen`);
  parts.push(`- Bruk emoji sparsomt (maks 1)`);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Template-fallback (rask, gratis — brukes hvis LLM feiler)
// ---------------------------------------------------------------------------

function templateExplanation(ctx: TradeContext): string {
  const sym = ctx.symbol.replace("USDT", "");

  if (ctx.strategy === "grid" && ctx.side === "buy") {
    const level = ctx.indicators?.grid_level;
    const profit = ctx.indicators?.profit_pct;
    return `🔲 Grid-kjøp: Prisen falt til nivå ${level ?? "?"} — boten kjøpte ${ctx.amountNok.toFixed(0)} kr ${sym} automatisk. Mål: selg med +${profit?.toFixed(1) ?? "2"}% gevinst på neste nivå.`;
  }

  if (ctx.strategy === "grid" && ctx.side === "sell") {
    const profit = ctx.indicators?.profit_pct;
    return `💰 Grid-salg: Prisen steg — boten solgte ${sym} med +${profit?.toFixed(1) ?? "?"}% gevinst. Grid-strategien kjøper lavt og selger høyt, igjen og igjen.`;
  }

  if (ctx.side === "buy") {
    return `🤖 AI-kjøp: Boten kjøpte ${ctx.amountNok.toFixed(0)} kr ${sym} basert på tekniske signaler. Se historikken for detaljer.`;
  }

  return `🤖 AI-salg: Boten solgte ${sym} og realiserte gevinsten.`;
}

// ---------------------------------------------------------------------------
// Hovedfunksjon
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Du er en rolig norsk trading-assistent som forklarer botens valg til nybegynnere. Kort, konkret, ærlig. Aldri hype. Aldri gevinstløfter.`;

/**
 * Generer en AI-forklaring for et trade.
 *
 * Bruker DeepSeek (billig, rask) med template-fallback ved feil.
 * Kalles ETTER executeTrade — feil skal aldri stoppe trading.
 */
export async function generateTradeExplanation(
  ctx: TradeContext,
): Promise<ExplanationResult> {
  const start = Date.now();

  try {
    const prompt = buildPrompt(ctx);

    // Bruk Kimi (OAuth-token er deployet i Workers) — DeepSeek krever egen API-nøkkel
    const response: AIResponse = await chatWithAI({
      provider: "kimi",
      messages: [{ role: "user", content: prompt }],
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 200,
    });

    const text = response.content?.trim();
    if (!text || text.length < 10) {
      throw new Error("Tom LLM-respons");
    }

    return {
      text,
      source: "llm",
      tokens: response.usage?.total_tokens,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    // Stille fallback — aldri la AI-feil stoppe trading
    console.warn("[AI-Explanation] LLM feilet, bruker template:", (err as Error).message);
    return {
      text: templateExplanation(ctx),
      source: "template",
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Batch: generer forklaringer for flere trades samtidig.
 * Brukes av tick etter executeTrade — én LLM-kall per trade er nok.
 */
export async function generateExplanationsBatch(
  contexts: TradeContext[],
): Promise<ExplanationResult[]> {
  // Kjør sekvensielt for å unngå rate-limit (max 3 parallelt)
  const results: ExplanationResult[] = [];
  const chunks: TradeContext[][] = [];
  for (let i = 0; i < contexts.length; i += 3) {
    chunks.push(contexts.slice(i, i + 3));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((ctx) => generateTradeExplanation(ctx)),
    );
    results.push(...chunkResults);
  }

  return results;
}
