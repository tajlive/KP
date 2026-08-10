/**
 * trade-explainer — norsk én-setnings-forklaring per trade.
 * Mega-plan Oppgave 2.2 (2026-08-10).
 *
 * «LLM forklarer HVER handel på mormor-norsk:
 *  "Prisen falt, Piloten kjøpte billig. Når den stiger igjen, selger den."»
 *
 * Prioritet (ærlighet først — ingen fabrikkerte forklaringer):
 * 1. **strategyReason** — strategiens egen reason fra signalet. For simple_grid
 *    er den allerede mormor-norsk og faktakorrekt. Brukes ALLTID direkte,
 *    LLM kalles ikke (gratis, raskt, korrekt).
 * 2. **LLM** (Kimi K3 via chatWithKimi fra @/lib/ai/providers) — kun for
 *    trades UTEN strategyReason (eldre strategier). Svaret valideres mot
 *    forbudte påstander (gevinstløfter, superlativer).
 * 3. **Template** — hardkodet, alltid korrekt, alltid tilgjengelig.
 *    Brukes ved LLM-feil, timeout, eller valideringsbrudd.
 *
 * Bruk (server-side kun — inneholder API-nøkler):
 *   const { text, source } = await explainTrade(trade);
 *   // skriv text til trades.pilot_explanation
 */

import { chatWithKimi, KIMI_MODELS } from "@/lib/ai/providers";

export interface TradeFacts {
  side: "BUY" | "SELL";
  /** Trading pair, f.eks. "SOLUSDT" eller "SOLUSDC" */
  pair: string;
  /** Handelsbeløp i NOK */
  totalValueNok: number;
  /** Realisert gevinst/tap i NOK (kun salg) */
  realizedPnl?: number | null;
  /** Strategiens egen reason — brukes direkte hvis den finnes */
  strategyReason?: string | null;
  /** take_profit / stop_loss / manual / auto */
  exitReason?: string | null;
}

export interface ExplainResult {
  text: string;
  source: "strategy" | "llm" | "template";
}

export interface ExplainOptions {
  /** Sett false for å tvinge template (f.eks. i cron uten LLM-budsjett) */
  useLlm?: boolean;
  /** LLM-timeout i ms. Default 8000. */
  timeoutMs?: number;
}

/** Påstander som ALDRI skal nå brukerflaten (fakta-regelen) */
const FORBUDT = [
  /garanter/i,
  /risikofri\s+(gevinst|profitt|inntekt)/i,
  /du (vil|skal) tjene/i,
  /kan ikke tape/i,
  /sikker (gevinst|profitt)/i,
  /blir rik/i,
  /månen/i,
  /to the moon/i,
];

const SYSTEM_PROMPT = `Du er Piloten i Klarpakke — en vennlig norsk handelsrobot.
Forklar ÉN handel med ÉN kort setning på enkelt norsk (bokmål), som til en person på 60 uten teknisk kunnskap.

Regler (brudd = svaret kastes):
- Maks 20 ord
- Snakk i jeg-form («Jeg kjøpte …»)
- Ingen fagord (RSI, MACD, støtte, motstand, volatilitet, indikator)
- ALDRI løfter om fremtidig gevinst («du vil tjene», «garantert»)
- Kun tallene du får i input — ikke finn på nye
- Ærlig ved tap — aldri pynt på det`;

function coin(pair: string): string {
  return pair.replace(/USDT|USDC/gi, "");
}

function validerLlmSvar(tekst: string): boolean {
  const trimmet = tekst.trim();
  if (trimmet.length < 10 || trimmet.length > 220) return false;
  // Maks 2 setninger
  const setninger = trimmet.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (setninger.length > 2) return false;
  if (FORBUDT.some((mønster) => mønster.test(trimmet))) return false;
  return true;
}

function templateForklaring(trade: TradeFacts): string {
  const c = coin(trade.pair);

  if (trade.side === "BUY") {
    return `Prisen falt, så jeg kjøpte litt ${c} billig. Når den stiger igjen, selger jeg.`;
  }

  const pnl = trade.realizedPnl;
  if (trade.exitReason === "stop_loss" || (pnl !== null && pnl !== undefined && pnl < 0)) {
    return `Jeg solgte litt ${c} for å begrense tapet. Bedre det enn å se den falle videre.`;
  }
  if (pnl !== null && pnl !== undefined && pnl > 0) {
    return `Prisen steg, så jeg solgte litt ${c} med gevinst. Pengene er trygge på kontoen din.`;
  }
  return `Jeg solgte litt ${c}.`;
}

function byggLlmPrompt(trade: TradeFacts): string {
  const c = coin(trade.pair);
  const belop = Math.round(trade.totalValueNok);
  const linjer = [`Handel: ${trade.side === "BUY" ? "KJØP" : "SALG"} av ${c} for ${belop} kr (lekepenger).`];

  if (trade.side === "SELL") {
    const pnl = trade.realizedPnl;
    if (pnl !== null && pnl !== undefined) {
      linjer.push(
        pnl >= 0
          ? `Resultat: gevinst på ${Math.round(pnl)} kr.`
          : `Resultat: tap på ${Math.abs(Math.round(pnl))} kr${trade.exitReason === "stop_loss" ? " (automatisk brems)" : ""}.`,
      );
    }
  }
  linjer.push("Forklar til eieren hva du gjorde og hvorfor — med ÉN setning.");
  return linjer.join("\n");
}

/**
 * Forklar én trade på mormor-norsk. Se modul-doc for prioritet.
 */
export async function explainTrade(
  trade: TradeFacts,
  options: ExplainOptions = {},
): Promise<ExplainResult> {
  // 1. Strategiens egen reason — aldri overskriv faktakorrekt motor-tekst
  if (trade.strategyReason?.trim()) {
    return { text: trade.strategyReason.trim(), source: "strategy" };
  }

  // 2. LLM (kun hvis ikke eksplisitt deaktivert)
  if (options.useLlm !== false) {
    const timeoutMs = options.timeoutMs ?? 8000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("LLM-timeout")), timeoutMs);
      });
      const svar = await Promise.race([
        chatWithKimi(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: byggLlmPrompt(trade) },
          ],
          { model: KIMI_MODELS.K3, maxTokens: 120 },
        ),
        timeout,
      ]);

      const tekst = svar.content.trim();
      if (validerLlmSvar(tekst)) {
        return { text: tekst, source: "llm" };
      }
      // Valideringsbrudd → faller gjennom til template
    } catch {
      // LLM-nedetid/feil/timeout → template (aldri krasj mot bruker)
    } finally {
      // Hindrer hengende timeout-promise (unhandled rejection etter avgjort race)
      if (timer) clearTimeout(timer);
    }
  }

  // 3. Template — alltid korrekt
  return { text: templateForklaring(trade), source: "template" };
}
