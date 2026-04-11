/**
 * API v1: Signals Consolidated Endpoint
 * 
 * Consolidates signal operations under /api/v1/signals/[action]
 * 
 * Actions:
 * - current: Get current signal
 * - explanation: Get signal explanation
 */

import { NextRequest, NextResponse } from "next/server";

const SIGNAL_ACTIONS = [
  "current",
  "explanation",
] as const;

type SignalAction = (typeof SIGNAL_ACTIONS)[number];

function isValidAction(action: string): action is SignalAction {
  return SIGNAL_ACTIONS.includes(action as SignalAction);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: SIGNAL_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "current": {
        const { GET: currentHandler } = await import("@/app/api/signal/current/route");
        return currentHandler(request);
      }
      case "explanation": {
        // explanation uses POST
        return NextResponse.json(
          { error: "explanation only supports POST" },
          { status: 405 }
        );
      }
      default:
        return NextResponse.json(
          { error: "Action not supported" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/signals/${(await params).action}]`, error);
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
        { error: "Unknown action", validActions: SIGNAL_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "explanation": {
        const { POST: explanationHandler } = await import("@/app/api/signal/explanation/route");
        return explanationHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/signals/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
