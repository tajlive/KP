/**
 * API v1: Binance Exchange Consolidated Endpoint
 * 
 * Consolidates Binance operations under /api/v1/exchanges/binance/[action]
 * 
 * Actions:
 * - test: Test Binance API connection
 * - keys: Manage API keys
 * - encrypt: Encrypt API credentials
 */

import { NextRequest, NextResponse } from "next/server";

const BINANCE_ACTIONS = [
  "test",
  "keys",
  "encrypt",
] as const;

type BinanceAction = (typeof BINANCE_ACTIONS)[number];

function isValidAction(action: string): action is BinanceAction {
  return BINANCE_ACTIONS.includes(action as BinanceAction);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: BINANCE_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "test": {
        // test only has POST
        return NextResponse.json(
          { error: "test only supports POST" },
          { status: 405 }
        );
      }
      case "keys": {
        const { GET: handler } = await import("@/app/api/binance/keys/route");
        return handler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/exchanges/binance/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: BINANCE_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "test": {
        const { POST: handler } = await import("@/app/api/binance/test/route");
        return handler(request);
      }
      case "keys": {
        const { POST: handler } = await import("@/app/api/binance/keys/route");
        return handler(request);
      }
      case "encrypt": {
        const { POST: handler } = await import("@/app/api/binance/encrypt/route");
        return handler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/exchanges/binance/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
