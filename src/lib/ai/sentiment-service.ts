/**
 * AI Sentiment Service - AI MVP Seksjon 6
 * Henter Fear & Greed Index og analyserer markedssentiment
 */

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

export type MarketSentiment = "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";

export interface SentimentAnalysis {
  currentValue: number;
  classification: MarketSentiment;
  recommendation: "buy_dip" | "accumulate" | "hold" | "take_profits" | "reduce_exposure";
  confidence: number;
  reasoning: string;
  historicalContext: {
    lastWeek: number;
    lastMonth: number;
    trend: "improving" | "worsening" | "stable";
  };
}

const FEAR_GREED_API = "https://api.alternative.me/fng/?limit=30";

const SENTIMENT_THRESHOLDS = {
  extreme_fear: { min: 0, max: 20 },
  fear: { min: 21, max: 40 },
  neutral: { min: 41, max: 60 },
  greed: { min: 61, max: 80 },
  extreme_greed: { min: 81, max: 100 },
};

/**
 * Henter Fear & Greed Index data fra alternative.me
 */
export async function fetchFearGreedIndex(): Promise<FearGreedData[]> {
  try {
    const response = await fetch(FEAR_GREED_API, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache i 5 minutter
    });

    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Failed to fetch Fear & Greed Index:", error);
    // Returner neutral verdi ved feil
    return [
      {
        value: 50,
        value_classification: "Neutral",
        timestamp: Date.now().toString(),
        time_until_update: "0",
      },
    ];
  }
}

/**
 * Klassifiserer sentiment basert på verdi
 */
export function classifySentiment(value: number): MarketSentiment {
  if (value <= 20) return "extreme_fear";
  if (value <= 40) return "fear";
  if (value <= 60) return "neutral";
  if (value <= 80) return "greed";
  return "extreme_greed";
}

/**
 * Analyserer sentiment og gir anbefalinger
 */
export async function analyzeMarketSentiment(): Promise<SentimentAnalysis> {
  const data = await fetchFearGreedIndex();
  const current = data[0];
  const currentValue = parseInt(current.value.toString(), 10);
  const classification = classifySentiment(currentValue);

  // Beregn trend
  const lastWeek = data.slice(0, 7);
  const lastMonth = data;
  const weekAvg = lastWeek.reduce((sum, d) => sum + parseInt(d.value.toString(), 10), 0) / lastWeek.length;
  const monthAvg = lastMonth.reduce((sum, d) => sum + parseInt(d.value.toString(), 10), 0) / lastMonth.length;

  let trend: "improving" | "worsening" | "stable" = "stable";
  if (currentValue > weekAvg + 5) trend = "improving";
  else if (currentValue < weekAvg - 5) trend = "worsening";

  // Bestem anbefaling
  let recommendation: SentimentAnalysis["recommendation"];
  let reasoning: string;
  let confidence: number;

  switch (classification) {
    case "extreme_fear":
      recommendation = "buy_dip";
      reasoning = "Markedet viser ekstrem frykt. Historisk sett har dette vært en god tid for langsiktige kjøp.";
      confidence = 0.85;
      break;
    case "fear":
      recommendation = "accumulate";
      reasoning = "Negativt sentiment, men ikke ekstremt. Gradvis opphoping anbefales.";
      confidence = 0.7;
      break;
    case "neutral":
      recommendation = "hold";
      reasoning = "Balansert sentiment. Hold eksisterende posisjoner uten store endringer.";
      confidence = 0.6;
      break;
    case "greed":
      recommendation = "take_profits";
      reasoning = "Markedet er optimistisk. Vurder å ta noe gevinst.";
      confidence = 0.65;
      break;
    case "extreme_greed":
      recommendation = "reduce_exposure";
      reasoning = "Ekstrem optimisme kan indikere en topp. Reduser risiko.";
      confidence = 0.75;
      break;
  }

  return {
    currentValue,
    classification,
    recommendation,
    confidence,
    reasoning,
    historicalContext: {
      lastWeek: Math.round(weekAvg),
      lastMonth: Math.round(monthAvg),
      trend,
    },
  };
}

/**
 * Formaterer sentiment for visning
 */
export function formatSentiment(
  sentiment: MarketSentiment,
  locale: string = "no"
): { label: string; color: string; emoji: string } {
  const labels: Record<string, Record<MarketSentiment, { label: string; color: string; emoji: string }>> = {
    no: {
      extreme_fear: { label: "Ekstrem Frykt", color: "text-red-500", emoji: "😱" },
      fear: { label: "Frykt", color: "text-orange-500", emoji: "😰" },
      neutral: { label: "Nøytral", color: "text-yellow-500", emoji: "😐" },
      greed: { label: "Grådighet", color: "text-emerald-500", emoji: "😏" },
      extreme_greed: { label: "Ekstrem Grådighet", color: "text-green-500", emoji: "🤑" },
    },
    en: {
      extreme_fear: { label: "Extreme Fear", color: "text-red-500", emoji: "😱" },
      fear: { label: "Fear", color: "text-orange-500", emoji: "😰" },
      neutral: { label: "Neutral", color: "text-yellow-500", emoji: "😐" },
      greed: { label: "Greed", color: "text-emerald-500", emoji: "😏" },
      extreme_greed: { label: "Extreme Greed", color: "text-green-500", emoji: "🤑" },
    },
  };

  return labels[locale]?.[sentiment] || labels.no[sentiment];
}

/**
 * Sjekker om sentiment tilsier endring i strategi
 */
export function shouldAdjustStrategy(
  sentiment: MarketSentiment,
  currentDrawdown: number
): { shouldAdjust: boolean; adjustment: string; reason: string } {
  // Ekstrem frykt + høy drawdown = øk kjøpsfrekvens
  if (sentiment === "extreme_fear" && currentDrawdown > 10) {
    return {
      shouldAdjust: true,
      adjustment: "increase_dca_frequency",
      reason: "Ekstrem frykt med høy drawdown - øk DCA-frekvens for å kjøpe dippen",
    };
  }

  // Ekstrem grådighet = reduser posisjonsstørrelse
  if (sentiment === "extreme_greed") {
    return {
      shouldAdjust: true,
      adjustment: "reduce_position_size",
      reason: "Ekstrem grådighet - reduser risiko",
    };
  }

  // Normalt sentiment = ingen endring
  return {
    shouldAdjust: false,
    adjustment: "none",
    reason: "Normalt sentiment - behold nåværende strategi",
  };
}
