/**
 * API v1: Exchanges Consolidated Endpoint
 * 
 * Consolidates exchange operations under /api/v1/exchanges/[action]
 * 
 * Actions:
 * - connections: Manage exchange connections
 * - sync: Sync exchange data
 */

import { NextRequest, NextResponse } from "next/server";

const EXCHANGE_ACTIONS = [
  "connections",
  "sync",
] as const;

type ExchangeAction = (typeof EXCHANGE_ACTIONS)[number];

function isValidAction(action: string): action is ExchangeAction {
  return EXCHANGE_ACTIONS.includes(action as ExchangeAction);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: EXCHANGE_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "connections": {
        const { GET: connectionsHandler } = await import("@/app/api/exchanges/connections/route");
        return connectionsHandler(request);
      }
      case "sync": {
        // sync only has POST
        return NextResponse.json(
          { error: "sync only supports POST" },
          { status: 405 }
        );
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/exchanges/${(await params).action}]`, error);
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
        { error: "Unknown action", validActions: EXCHANGE_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "connections": {
        const { POST: connectionsHandler } = await import("@/app/api/exchanges/connections/route");
        return connectionsHandler(request);
      }
      case "sync": {
        const { POST: syncHandler } = await import("@/app/api/exchanges/sync/route");
        return syncHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/exchanges/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
