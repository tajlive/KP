/**
 * AI Sentiment API Route
 * Fetches Fear & Greed index from alternative.me
 * Caches result for 15 minutes to avoid rate limits
 */

import { NextRequest, NextResponse } from "next/server";

export const revalidate = 900; // 15 minutes

interface FearGreedData {
  name: string;
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update: string;
  }>;
  metadata: {
    error?: string;
  };
}

export async function GET(_req: NextRequest) {
  try {
    // Fetch from alternative.me Fear & Greed API
    const response = await fetch(
      "https://api.alternative.me/fng/?limit=1",
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 900 }, // 15 min cache
      }
    );

    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status}`);
    }

    const data: FearGreedData = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("No sentiment data available");
    }

    const latest = data.data[0];
    const value = parseInt(latest.value, 10);
    
    // Map classification to Norwegian
    const classificationMap: Record<string, string> = {
      "Extreme Fear": "Ekstrem frykt",
      "Fear": "Frykt",
      "Neutral": "Nøytral",
      "Greed": "Grådighet",
      "Extreme Greed": "Ekstrem grådighet",
    };

    // Determine trend based on previous values if available
    let trend: "up" | "down" | "stable" = "stable";
    if (data.data.length > 1) {
      const previous = parseInt(data.data[1].value, 10);
      if (value > previous + 5) trend = "up";
      else if (value < previous - 5) trend = "down";
    }

    // Calculate advice based on sentiment
    let advice: string;
    if (value <= 20) {
      advice = "Markedsfrykt er ekstrem. Dette kan være en god kjøpsmulighet for langsiktige investorer.";
    } else if (value <= 40) {
      advice = "Markedsfrykt er tilstede. Vurder gradvis oppkjøp (DCA).";
    } else if (value <= 60) {
      advice = "Markedsstemningen er nøytral. Fortsett med din plan.";
    } else if (value <= 80) {
      advice = "Grådighet i markedet. Vær forsiktig med nye kjøp.";
    } else {
      advice = "Ekstrem grådighet. Dette kan signalisere en topp. Vurder å ta litt profitt.";
    }

    return NextResponse.json({
      value,
      classification: classificationMap[latest.value_classification] || latest.value_classification,
      classificationEn: latest.value_classification,
      timestamp: new Date(parseInt(latest.timestamp) * 1000).toISOString(),
      trend,
      advice,
      source: "alternative.me",
      nextUpdate: latest.time_until_update 
        ? new Date(Date.now() + parseInt(latest.time_until_update) * 1000).toISOString()
        : null,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });

  } catch (error) {
    console.error("[AI Sentiment API Error]:", error);
    
    // Return fallback data
    return NextResponse.json({
      value: 50,
      classification: "Nøytral",
      classificationEn: "Neutral",
      timestamp: new Date().toISOString(),
      trend: "stable" as const,
      advice: "Kunne ikke hente markedsdata. Fortsett med din plan.",
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 200, // Return 200 with fallback data
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }
}
