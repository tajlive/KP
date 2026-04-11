/**
 * API v1: Copy Trading Consolidated Endpoint
 * 
 * Consolidates copy trading operations under /api/v1/copy-trading/[action]
 * 
 * Actions:
 * - discover: Discover traders to copy
 * - follow: Follow a trader
 * - unfollow: Unfollow a trader
 * - resolve-trader: Resolve trader info
 * - leaders: Get leaderboard
 * - following: Get followed traders
 */

import { NextRequest, NextResponse } from "next/server";

const COPY_TRADING_ACTIONS = [
  "discover",
  "follow",
  "unfollow",
  "resolve-trader",
  "leaders",
  "following",
] as const;

type CopyTradingAction = (typeof COPY_TRADING_ACTIONS)[number];

function isValidAction(action: string): action is CopyTradingAction {
  return COPY_TRADING_ACTIONS.includes(action as CopyTradingAction);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: COPY_TRADING_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "discover": {
        const { GET: discoverHandler } = await import("@/app/api/copy-trading/discover/route");
        return discoverHandler(request);
      }
      case "resolve-trader": {
        const { GET: resolveHandler } = await import("@/app/api/copy-trading/resolve-trader/route");
        return resolveHandler(request);
      }
      case "leaders": {
        const { GET: leadersHandler } = await import("@/app/api/copy-trading/leaders/route");
        return leadersHandler(request);
      }
      case "following": {
        const { GET: followingHandler } = await import("@/app/api/copy-trading/following/route");
        return followingHandler(request);
      }
      case "follow":
      case "unfollow": {
        return NextResponse.json(
          { error: "This action only supports POST" },
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
    console.error(`[v1/copy-trading/${(await params).action}]`, error);
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
        { error: "Unknown action", validActions: COPY_TRADING_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "follow": {
        const { POST: followHandler } = await import("@/app/api/copy-trading/follow/route");
        return followHandler(request);
      }
      case "unfollow": {
        // unfollow doesn't export POST directly, it uses route.ts default export pattern
        // Redirect to the existing route
        return NextResponse.json(
          { error: "Please use /api/copy-trading/unfollow directly" },
          { status: 501 }
        );
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/copy-trading/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
