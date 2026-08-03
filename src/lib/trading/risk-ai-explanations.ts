/**
 * AI-forklaringer for risikopanelet (PROMPT #14 / BRIEF §9).
 *
 * DESIGNREGEL: Ethvert nøkkeltall skal ha en AI-forklaring på folkeskole-norsk:
 *   1. Hva betyr dette for MEG?
 *   2. Hva bør jeg gjøre?
 *
 * Fakta-regel: AI forklarer tallene — lover ALDRI fremtidig avkastning.
 * i18n: genereres på brukerens språk (no/en).
 * Cache: per bruker per dag (kostnadskontroll) — nøkkel risk-ai:{userId}:{date}:{locale}.
 */

import { createHash } from "crypto";

export type RiskMetricsForAI = {
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;
  omegaRatio: number;
  maxConsecutiveLosses: number;
  gainPainRatio: number;
  riskScore: number;
  tradeCount: number;
  winRatePct: number | null;
};

export type RiskAIExplanation = {
  summary: string;
  metrics: Record<string, string>;
  source: "llm" | "template";
  generatedAt: string;
};

const SYSTEM_PROMPT_NO = `Du er Klarpakkes personlige trading-coach for nybegynnere.
Regler:
- Skriv på enkelt, varmt norsk (bokmål) — som til en venn som aldri har tradet.
- For HVERT nøkkeltall: forklar hva det betyr for brukeren, og hva de bør gjøre.
- ALDRI lov fremtidig avkastning eller gevinst. Forklar KUN tallene.
- Maks 2 setninger per nøkkeltall. Konkret råd, ikke teori.
- Hvis dataene er for få (< 5 handler), si det ærlig og be brukeren la roboten jobbe litt til.`;

const SYSTEM_PROMPT_EN = `You are Klarpakke's personal trading coach for beginners.
Rules:
- Write in simple, warm English — as to a friend who has never traded.
- For EACH metric: explain what it means for the user, and what they should do.
- NEVER promise future returns or profits. ONLY explain the numbers.
- Max 2 sentences per metric. Concrete advice, not theory.
- If there is too little data (< 5 trades), say so honestly and ask the user to let the bot work a bit longer.`;

/** Template-fallback når LLM er utilgjengelig (Kimi OAuth nedetid e.l.) */
function templateExplanation(
  m: RiskMetricsForAI,
  locale: string,
): RiskAIExplanation {
  const no = locale !== "en";
  const few = m.tradeCount < 5;

  const sortinoText = no
    ? m.sortinoRatio >= 1
      ? "Sortino-tallet ditt er over 1 — du får god betalt for risikoen du tar. Fortsett med samme strategi."
      : m.sortinoRatio < 0
        ? "Sortino-tallet er negativt — tapene dine er større enn gevinstene så langt. Vurder Auto-modus med stopp-loss slik at tapene begrenses automatisk."
        : "Sortino-tallet ditt er under 1 — gevinstene dine veier foreløpig ikke helt opp for tapene. La roboten samle flere handler før du gjør endringer."
    : m.sortinoRatio >= 1
      ? "Your Sortino ratio is above 1 — you're well compensated for the risk you take. Stick with the same strategy."
      : m.sortinoRatio < 0
        ? "Your Sortino ratio is negative — losses outweigh gains so far. Consider Auto mode with a stop-loss to cap losses automatically."
        : "Your Sortino ratio is below 1 — gains don't quite offset losses yet. Let the bot collect more trades before making changes.";

  const streakText = no
    ? m.maxConsecutiveLosses >= 4
      ? `Du har hatt ${m.maxConsecutiveLosses} tap på rad. Det kjennes tungt, men er normalt i krypto. Ikke stopp roboten midt i en nedtur — det er da de fleste gjør feil.`
      : `Lengste tapsrekke er ${m.maxConsecutiveLosses} handler — helt innenfor normalen. Roboten håndterer dette automatisk.`
    : m.maxConsecutiveLosses >= 4
      ? `You've had ${m.maxConsecutiveLosses} losses in a row. That feels heavy, but it's normal in crypto. Don't stop the bot mid-dip — that's when most people make mistakes.`
      : `Your longest losing streak is ${m.maxConsecutiveLosses} trades — well within normal. The bot handles this automatically.`;

  const varText = no
    ? `På en typisk dårlig dag kan du miste ca. ${Math.abs(m.var95 * 100).toFixed(1)} % av porteføljen (VaR 95 %). Er det mer enn du er komfortabel med? Senk risikonivået i innstillingene.`
    : `On a typical bad day you could lose about ${Math.abs(m.var95 * 100).toFixed(1)}% of your portfolio (VaR 95%). If that's more than you're comfortable with, lower the risk level in settings.`;

  const winRateText = no
    ? m.winRatePct != null && m.winRatePct < 40
      ? `Du vinner på ${m.winRatePct.toFixed(0)} % av handlene — lavere enn snittet. Det kan bety at du selger for tidlig. Prøv Auto med trailing stopp-loss, så vinnerne får løpe litt lenger.`
      : `Du vinner på ${m.winRatePct?.toFixed(0) ?? "–"} % av handlene dine. Grid-strategien er laget for å vinne ofte i sidelengs markeder — tålmodighet lønner seg.`
    : m.winRatePct != null && m.winRatePct < 40
      ? `You win on ${m.winRatePct.toFixed(0)}% of your trades — below average. This may mean you're selling too early. Try Auto with a trailing stop-loss so winners run a bit longer.`
      : `You win on ${m.winRatePct?.toFixed(0) ?? "–"}% of your trades. The grid strategy is built to win often in sideways markets — patience pays off.`;

  const summary = few
    ? no
      ? "Du har for få handler ennå til at tallene sier noe sikkert. La roboten jobbe noen dager til — så gir vi deg et skikkelig bilde."
      : "You have too few trades yet for the numbers to be reliable. Let the bot work for a few more days — then we'll give you a proper picture."
    : no
      ? m.sortinoRatio < 0 || (m.winRatePct != null && m.winRatePct < 40)
        ? "Tallene dine viser at tapene veier tyngre enn gevinstene akkurat nå. Det vanligste rådet her: slå på Auto-modus med stopp-loss, og la roboten håndtere timingen."
        : "Tallene dine ser rimelig sunne ut. Fortsett med dagens innstillinger, og sjekk innom ukentlig."
      : m.sortinoRatio < 0 || (m.winRatePct != null && m.winRatePct < 40)
        ? "Your numbers show losses currently outweighing gains. The most common advice here: turn on Auto mode with a stop-loss, and let the bot handle the timing."
        : "Your numbers look reasonably healthy. Keep your current settings and check in weekly.";

  return {
    summary,
    metrics: {
      sortinoRatio: sortinoText,
      maxConsecutiveLosses: streakText,
      var95: varText,
      winRate: winRateText,
    },
    source: "template",
    generatedAt: new Date().toISOString(),
  };
}

function buildPrompt(m: RiskMetricsForAI, locale: string): string {
  const no = locale !== "en";
  const header = no
    ? "Her er risikotallene til en bruker. Skriv 1) én samlet oppsummering (2-3 setninger med konkret råd) og 2) én forklaring per nøkkeltall. Svar i dette JSON-formatet: {\"summary\": \"...\", \"metrics\": {\"sortinoRatio\": \"...\", \"maxConsecutiveLosses\": \"...\", \"var95\": \"...\", \"winRate\": \"...\"}}"
    : "Here are a user's risk metrics. Write 1) one overall summary (2-3 sentences with concrete advice) and 2) one explanation per metric. Reply in this JSON format: {\"summary\": \"...\", \"metrics\": {\"sortinoRatio\": \"...\", \"maxConsecutiveLosses\": \"...\", \"var95\": \"...\", \"winRate\": \"...\"}}";
  return `${header}

Sortino-forhold: ${m.sortinoRatio.toFixed(2)}
Calmar-forhold: ${m.calmarRatio.toFixed(2)}
VaR 95%: ${(m.var95 * 100).toFixed(2)}%
Omega-forhold: ${m.omegaRatio.toFixed(2)}
Lengste tapsrekke: ${m.maxConsecutiveLosses}
Gain/pain: ${m.gainPainRatio.toFixed(2)}
Risikoscore (0-100): ${m.riskScore}
Antall handler: ${m.tradeCount}
Vinnrate: ${m.winRatePct != null ? m.winRatePct.toFixed(1) + "%" : "ukjent"}`;
}

/**
 * Generer AI-forklaring for risikopanelet.
 * Caches per bruker per dag per språk via callers KV-binding.
 */
export async function generateRiskExplanations(
  metrics: RiskMetricsForAI,
  locale: string,
  cacheGet?: (key: string) => Promise<string | null>,
  cacheSet?: (key: string, value: string, ttlSeconds: number) => Promise<void>,
): Promise<RiskAIExplanation> {
  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = createHash("sha1")
    .update(JSON.stringify(metrics))
    .digest("hex")
    .slice(0, 8);
  const cacheKey = `risk-ai:${fingerprint}:${day}:${locale}`;

  if (cacheGet) {
    const cached = await cacheGet(cacheKey).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached) as RiskAIExplanation;
      } catch {
        // fall through til regenerering
      }
    }
  }

  let result: RiskAIExplanation;
  try {
    const { chatWithAI } = await import("@/lib/ai/providers");
    const response = await chatWithAI({
      provider: "kimi",
      messages: [{ role: "user", content: buildPrompt(metrics, locale) }],
      systemPrompt: locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_NO,
      maxTokens: 700,
    });
    const text = response.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("LLM returnerte ikke JSON");
    const parsed = JSON.parse(jsonMatch[0]);
    result = {
      summary: String(parsed.summary ?? ""),
      metrics: {
        sortinoRatio: String(parsed.metrics?.sortinoRatio ?? ""),
        maxConsecutiveLosses: String(parsed.metrics?.maxConsecutiveLosses ?? ""),
        var95: String(parsed.metrics?.var95 ?? ""),
        winRate: String(parsed.metrics?.winRate ?? ""),
      },
      source: "llm",
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[RiskAI] LLM feilet, bruker template:", (err as Error).message);
    result = templateExplanation(metrics, locale);
  }

  if (cacheSet) {
    await cacheSet(cacheKey, JSON.stringify(result), 86400).catch(() => {});
  }
  return result;
}
