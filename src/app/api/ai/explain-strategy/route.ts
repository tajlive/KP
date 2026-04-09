import { getErrorMessage } from "@/lib/utils/error";
import { perplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";

export const maxDuration = 20;

const STRATEGY_NAMES: { [key: string]: string } = {
  dca: "DCA (Dollar Cost Averaging)",
  grid: "Grid Trading",
  momentum: "Momentum",
  trend: "Trend Following",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const strategyType = (body?.strategyType || body?.strategy_type || "").toString().toLowerCase();
    const locale = (body?.locale || "no").toString();

    if (!strategyType) {
      return Response.json({ error: "strategyType required" }, { status: 400 });
    }

    const strategyLabel = STRATEGY_NAMES[strategyType] || strategyType;

    const systemNo = `Du er Klarpakkes AI Strategy Advisor. Forklar strategien "${strategyLabel}" på 2-4 setninger for en nybegynner.
Fokuser på: hva strategien gjør, hovedfordeler, og typisk risikonivå. Vær pedagogisk og kortfattet.`;

    const systemEn = `You are Klarpakke's AI Strategy Advisor. Explain the strategy "${strategyLabel}" in 2-4 sentences for a beginner.
Focus on: what the strategy does, main benefits, and typical risk level. Be educational and concise.`;

    const { text } = await generateText({
      model: perplexity("sonar-medium-online"),
      system: locale === "no" ? systemNo : systemEn,
      prompt: locale === "no"
        ? `Forklar strategien: ${strategyLabel}`
        : `Explain the strategy: ${strategyLabel}`,
    });

    return Response.json({ explanation: text });
  } catch (error: unknown) {
    console.error("AI Explain Strategy error:", getErrorMessage(error));
    return Response.json(
      { error: "Kunne ikke hente strategiforklaring" },
      { status: 500 },
    );
  }
}
