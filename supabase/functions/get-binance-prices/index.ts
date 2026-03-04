/**
 * Get Binance Prices Edge Function
 * Fetches current cryptocurrency prices from Binance API
 * Public endpoint - no auth required for price data
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BINANCE_API_URL = "https://api.binance.com";

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbols = url.searchParams.get("symbols");

    if (!symbols) {
      return new Response(
        JSON.stringify({ error: "Missing symbols parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse symbols (comma-separated)
    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());

    // Fetch prices from Binance - only for requested symbols to save bandwidth
    const binanceSymbols = JSON.stringify(symbolList);
    const response = await fetch(
      `${BINANCE_API_URL}/api/v3/ticker/24hr?symbols=${binanceSymbols}`,
    );

    if (!response.ok) {
      // Fallback: fetch all if symbols param fails
      const fallbackResponse = await fetch(
        `${BINANCE_API_URL}/api/v3/ticker/24hr`,
      );
      if (!fallbackResponse.ok) {
        throw new Error(`Binance API error: ${fallbackResponse.status}`);
      }
      const allTickers = await fallbackResponse.json();
      const filteredTickers = allTickers.filter((ticker: any) =>
        symbolList.includes(ticker.symbol),
      );
      return formatResponse(filteredTickers, corsHeaders);
    }

    const filteredTickers = await response.json();
    return formatResponse(filteredTickers, corsHeaders);
  } catch (error) {
    console.error("Error fetching Binance prices:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch prices",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function formatResponse(tickers: any[], corsHeaders: any) {
  const prices = tickers.map((ticker: any) => ({
    symbol: ticker.symbol,
    price: parseFloat(ticker.lastPrice),
    change24h: parseFloat(ticker.priceChangePercent),
    high24h: parseFloat(ticker.highPrice),
    low24h: parseFloat(ticker.lowPrice),
    volume24h: parseFloat(ticker.volume),
    quoteVolume: parseFloat(ticker.quoteVolume),
  }));

  return new Response(
    JSON.stringify({
      success: true,
      prices,
      timestamp: Date.now(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
