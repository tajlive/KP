import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { chatWithAI, SYSTEM_PROMPTS } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface MarketBrief {
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  highlights: string[];
  generated_at: string;
}

const MARKET_SYSTEM_PROMPT = `${SYSTEM_PROMPTS.MARKET_ANALYST}

Du er en krypto markedsanalytiker for Klarpakke. Skriv en kort, profesjonell markedsoppsummering på norsk.

Returner ALLTID JSON i dette formatet (ingen markdown, ingen forklaring):
{
  "summary": "2-3 setninger maks",
  "sentiment": "bullish" | "bearish" | "neutral",
  "highlights": ["3 korte punkter"]
}`;

function parseMarketJson(text: string): MarketBrief {
  try {
    // Try to extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(jsonText);

    return {
      summary: String(parsed.summary || "").trim(),
      sentiment: ["bullish", "bearish", "neutral"].includes(parsed.sentiment)
        ? (parsed.sentiment as "bullish" | "bearish" | "neutral")
        : "neutral",
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.slice(0, 3).map(String)
        : [],
      generated_at: new Date().toISOString(),
    };
  } catch {
    // If JSON parsing fails, create a structured response from the text
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    return {
      summary: lines.slice(0, 2).join(" ") || text.slice(0, 200),
      sentiment: "neutral",
      highlights: lines.slice(2, 5).length > 0 ? lines.slice(2, 5) : ["Markedsanalyse tilgjengelig"],
      generated_at: new Date().toISOString(),
    };
  }
}

export async function GET() {
  try {
    const db = createClient();

    // Check cache first
    const { data: cached } = await db
      .from("ai_cache")
      .select("value")
      .eq("cache_key", "market_brief")
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached?.value && typeof cached.value === "object" && "summary" in cached.value) {
      return NextResponse.json(cached.value as unknown as MarketBrief);
    }

    // Fetch latest prices — EU/EØS (2026): Kraken eneste tallkilde
    const pricesRes = await fetch(
      "/api/market/binance-24hr?symbols=BTCUSDT,ETHUSDT,SOLUSDT",
      { next: { revalidate: 300 } }
    );
    const priceBody = await pricesRes.json();
    const priceData = (priceBody.prices ?? []) as Array<{
      symbol: string;
      price: number;
      change24h: number;
    }>;

    const marketContext = priceData
      .map(
        (t) =>
          `${t.symbol}: $${t.price.toLocaleString()} (${t.change24h > 0 ? "+" : ""}${t.change24h.toFixed(2)}%)`
      )
      .join(", ");

    // Call AI via unified provider (KIMI/NVIDIA with fallback)
    let brief: MarketBrief;
    try {
      const aiResponse = await chatWithAI({
        systemPrompt: MARKET_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Dagens markedsdata (24t): ${marketContext}. Gi en kort oppsummering som JSON.`,
          },
        ],
        temperature: 0.5,
        maxTokens: 300,
      });

      brief = parseMarketJson(aiResponse.content);
    } catch {
      // AI unavailable — return graceful fallback with market data
      brief = {
        summary: `BTC er ${marketContext.includes("BTCUSDT") ? "i fokus" : "på markedet"}. Sjekk porteføljen din for oppdaterte priser.`,
        sentiment: "neutral",
        highlights: ["Markedsdata hentet fra Binance", "AI-analyse midlertidig utilgjengelig", "Priser oppdateres hvert 5. minutt"],
        generated_at: new Date().toISOString(),
      };
    }

    // Cache result
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    await db.from("ai_cache").upsert(
      {
        cache_key: "market_brief",
        value: brief as unknown as import("@/types/database.types").Json,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" }
    );

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
      { status: 200 }
    );
  }
}
