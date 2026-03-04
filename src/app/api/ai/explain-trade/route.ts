import { getErrorMessage } from "@/lib/utils/error";
import { perplexity } from "@ai-sdk/perplexity";
import { generateText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { trade, locale = "no" } = await req.json();

    if (!trade) {
      return Response.json({ error: "Trade data missing" }, { status: 400 });
    }

    const { symbol, side, amount, pnl, strategy_type } = trade;
    const isProfit = pnl >= 0;

    const systemPromptNo = `Du er en empatisk krypto-trener og ekspert. En bruker har akkurat gjennomført en trade.
Din jobb er å forklare hvorfor strategien tok dette valget, og gi et pedagogisk læringspoeng.
Traden var på beløpet: ${amount} NOK. Strategien: ${strategy_type}. Utfallet: ${pnl} NOK (${isProfit ? "Profitt" : "Tap"}).
Regler for svaret ditt:
1. Vær kortfattet, vennlig og bruk emojis. (Maks 3-4 setninger).
2. Hvis traden gikk i pluss: Feire gevinsten, men minn brukeren på å beskytte kapitalen sin og unngå FOMO.
3. Hvis traden gikk i minus: Vær støttende. Minn dem på at tap er en del av statistikken, og at strategien og risikostyring (stop-loss) beskytter dem over tid.
4. Identifiser et raskt læringspoeng basert på kryptoen (${symbol}) eller strategien.
Start svaret direkte, uten hilsen.`;

    const systemPromptEn = `You are an empathetic crypto trading coach. A user has just completed a trade.
Your job is to explain why the strategy made this choice and provide an educational takeaway.
Trade amount: ${amount} NOK. Strategy: ${strategy_type}. Outcome: ${pnl} NOK (${isProfit ? "Profit" : "Loss"}).
Rules for your response:
1. Be concise, friendly, and use emojis. (Max 3-4 sentences).
2. If profitable: Celebrate the win, but remind the user to protect their capital and avoid FOMO.
3. If loss: Be supportive. Remind them that losses are part of the statistics, and the strategy/risk management protects them long-term.
4. Identify a quick learning point based on the crypto (${symbol}) or strategy.
Start the response directly, with no greetings.`;

    const systemPrompt = locale === "no" ? systemPromptNo : systemPromptEn;

    const { text } = await generateText({
      model: perplexity("sonar-medium-online"),
      system: systemPrompt,
      prompt: `Forklar denne traden: Kjøpte/Solgte (${side}) paret ${symbol} via ${strategy_type}. Profitt/Tap var ${pnl}.`,
    });

    return Response.json({ explanation: text });
  } catch (error: unknown) {
    console.error("AI Explain Trade error:", getErrorMessage(error));
    return Response.json(
      { error: "Kunne ikke hente AI-forklaring" },
      { status: 500 },
    );
  }
}
