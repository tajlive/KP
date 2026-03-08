import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

interface MarketBrief {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  highlights: string[];
  generated_at: string;
}

export async function GET() {
  try {
    const db = (await createClient()) as any;

    // TODO: Create ai_cache table in database
    // Check cache first (refresh every hour)
    // const { data: cached } = await db
    //   .from("ai_cache")
    //   .select("*")
    //   .eq("cache_key", "market_brief")
    //   .gte("expires_at", new Date().toISOString())
    //   .maybeSingle();

    // if (cached?.value) {
    //   return NextResponse.json(cached.value as MarketBrief);
    // }

    // No OPENAI key = return a static brief
    if (!OPENAI_API_KEY) {
      const fallback: MarketBrief = {
        summary:
          "AI Market Brief er ikke konfigurert ennå. Sett OPENAI_API_KEY i miljøvariabler.",
        sentiment: "neutral",
        highlights: ["Konfigurer OPENAI_API_KEY for live AI-analyse"],
        generated_at: new Date().toISOString(),
      };
      return NextResponse.json(fallback);
    }

    // Fetch latest prices from Binance public API (no auth needed)
    const pricesRes = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]',
      { next: { revalidate: 300 } },
    );
    const priceData = await pricesRes.json();

    const marketContext = priceData
      .map(
        (t: {
          symbol: string;
          lastPrice: string;
          priceChangePercent: string;
        }) =>
          `${t.symbol}: $${parseFloat(t.lastPrice).toLocaleString()} (${parseFloat(t.priceChangePercent) > 0 ? "+" : ""}${t.priceChangePercent}%)`,
      )
      .join(", ");

    // Call OpenAI
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a crypto market analyst for Klarpakke, a Norwegian crypto trading platform. Write a brief, professional market summary in Norwegian. Return JSON: { "summary": "2-3 sentences max", "sentiment": "bullish" | "bearish" | "neutral", "highlights": ["3 short bullet points"] }`,
          },
          {
            role: "user",
            content: `Dagens markedsdata (24t): ${marketContext}. Gi en kort oppsummering.`,
          },
        ],
      }),
    });

    const aiData = await aiRes.json();
    const content = JSON.parse(aiData.choices[0].message.content);

    const brief: MarketBrief = {
      summary: content.summary,
      sentiment: content.sentiment,
      highlights: content.highlights,
      generated_at: new Date().toISOString(),
    };

    // TODO: Create ai_cache table in database
    // Cache in Supabase for 1 hour
    // await db
    //   .from("ai_cache")
    //   .upsert(
    //     {
    //       cache_key: "market_brief",
    //       value: brief,
    //       expires_at: new Date(Date.now() + 3600_000).toISOString(),
    //     },
    //     { onConflict: "cache_key" },
    //   )
    //   .select();

    return NextResponse.json(brief);
  } catch (err) {
    console.error("AI Market Brief error:", err);
    return NextResponse.json(
      {
        summary: "Kunne ikke generere markedsanalyse akkurat nå.",
        sentiment: "neutral" as const,
        highlights: [],
        generated_at: new Date().toISOString(),
      },
      { status: 200 }, // Graceful fallback, no 500
    );
  }
}
