/**
 * API v1: Market Data Consolidated Endpoint
 * 
 * Consolidates market data operations under /api/v1/market/[action]
 * 
 * Actions:
 * - prices: Get current prices
 * - 24hr: Get 24h stats
 * - depth: Get order book depth
 * - intelligence: Market intelligence
 */

import { NextRequest, NextResponse } from "next/server";

const MARKET_ACTIONS = [
  "prices",
  "24hr",
  "depth",
  "intelligence",
  "klines",
  "ticker",
] as const;

type MarketAction = (typeof MARKET_ACTIONS)[number];

function isValidAction(action: string): action is MarketAction {
  return MARKET_ACTIONS.includes(action as MarketAction);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: MARKET_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "prices": {
        const { GET: pricesHandler } = await import("@/app/api/market/binance-prices/route");
        return pricesHandler(request);
      }
      case "24hr": {
        const { GET: statsHandler } = await import("@/app/api/market/binance-24hr/route");
        return statsHandler(request);
      }
      case "intelligence": {
        const { GET: intelligenceHandler } = await import("@/app/api/market-intelligence/route");
        return intelligenceHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/market/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
