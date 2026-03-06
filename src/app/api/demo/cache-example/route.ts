/**
 * 🚀 Redis Caching Demo
 * 
 * Eksempel på hvordan bruke caching i API-routes
 * Viser både Vercel KV (Redis) og memory cache (dev)
 */

import { NextResponse } from "next/server";
import { cache, CACHE_TTL, withCache, cacheKeys } from "@/lib/cache";

// Demo-data fetcher
async function fetchMarketData(symbol: string) {
  // Simuler API-kall (bytt ut med reell Binance/Coingecko integrasjon)
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simuler nettverksforsinkelse
  
  return {
    symbol,
    price: Math.random() * 50000 + 30000, // Simulert BTC-pris
    change24h: (Math.random() - 0.5) * 10,
    timestamp: new Date().toISOString(),
    source: "api",
  };
}

/**
 * GET /api/demo/cache-example?symbol=BTCUSDT
 * 
 * Returnerer markedsdata med caching:
 * - Første kall: Henter fra API (tregt)
 * - Påfølgende kall: Henter fra cache (raskt)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  
  const cacheKey = cacheKeys.marketData(symbol);
  const startTime = Date.now();
  
  try {
    // Bruk withCache helper
    const data = await withCache(
      cacheKey,
      () => fetchMarketData(symbol),
      CACHE_TTL.MARKET_DATA // 10 sekunder
    );
    
    const duration = Date.now() - startTime;
    const isCached = duration < 100; // Anta cache hvis under 100ms
    
    return NextResponse.json({
      ...data,
      _meta: {
        cached: isCached,
        duration: `${duration}ms`,
        cacheKey,
        ttl: CACHE_TTL.MARKET_DATA / 1000 + "s",
      },
    });
  } catch (error) {
    console.error("[Cache Example] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/demo/cache-example/clear
 * 
 * Tømmer cache for testing
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    
    if (action === "clear") {
      await cache.clear();
      return NextResponse.json({ 
        message: "Cache cleared",
        timestamp: new Date().toISOString(),
      });
    }
    
    if (action === "stats") {
      // Hent cache-statistikk (kun for demo)
      return NextResponse.json({
        cacheType: process.env.KV_REST_API_URL ? "Vercel KV (Redis)" : "Memory",
        timestamp: new Date().toISOString(),
        note: "For full stats, use Vercel KV dashboard or Redis CLI",
      });
    }
    
    return NextResponse.json({ 
      error: "Invalid action. Use ?action=clear or ?action=stats" 
    }, { status: 400 });
  } catch (error) {
    console.error("[Cache Example] Error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
