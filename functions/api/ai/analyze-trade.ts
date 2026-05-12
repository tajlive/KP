export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}



import { perplexity } from '@ai-sdk/perplexity';
import { generateText } from 'ai';
import { getErrorMessage } from '@/lib/utils/error';

export const maxDuration = 30;

async function POSTHandler(request: Request, env: Env)(req: Request) {
  try {
    const { trade, locale, userLevel } = await req.json();

    const systemPrompt = locale === 'no' 
      ? `Du er en erfaren krypto-trader og lærer. Din oppgave er å analysere en planlagt trade og gi ærlig, pedagogisk tilbakemelding.
         Vurder risiko basert på symbol (${trade.symbol}), retning (${trade.side}) og beløp (${trade.amount} NOK).
         Svar på norsk. 
         Format: JSON med feltene:
         - riskLevel: 'low' | 'medium' | 'high' | 'extreme'
         - recommendation: 'approve' | 'caution' | 'block'
         - reasoning: Kort forklaring på analysen
         - educationalTips: Liste med 2-3 læringspoeng`
      : `You are an experienced crypto trader and educator. Your task is to analyze a planned trade and provide honest, educational feedback.
         Assess risk based on symbol (${trade.symbol}), side (${trade.side}), and amount (${trade.amount} NOK).
         Answer in English.
         Format: JSON with fields:
         - riskLevel: 'low' | 'medium' | 'high' | 'extreme'
         - recommendation: 'approve' | 'caution' | 'block'
         - reasoning: Short explanation of the analysis
         - educationalTips: List of 2-3 learning points`;

    const { text } = await generateText({
      model: perplexity('sonar-medium-online'),
      system: systemPrompt,
      prompt: `Analyser denne traden: ${JSON.stringify(trade)}. Brukeren er på nivå: ${userLevel}.`,
      // Requesting JSON output
    });

    // Simple JSON extraction from response (Perplexity can sometimes wrap it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    try {
      const result = JSON.parse(jsonStr);
      return Response.json(result);
    } catch (parseError) {
      // Fallback if AI doesn't return perfect JSON
      return Response.json({
        riskLevel: 'medium',
        recommendation: 'caution',
        reasoning: text,
        educationalTips: locale === 'no' 
          ? ["Vurder alltid markedsforholdene", "Bruk stop-loss"] 
          : ["Always consider market conditions", "Use stop-loss"]
      });
    }

  } catch (error: unknown) {
    console.error('AI Analysis error:', getErrorMessage(error));
    return Response.json({ error: 'Kunne ikke analysere trade' }, { status: 500 });
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'POST') {
      return POSTHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
