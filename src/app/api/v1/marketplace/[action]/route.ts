/**
 * API v1: Marketplace Consolidated Endpoint
 * 
 * Consolidates marketplace operations under /api/v1/marketplace/[action]
 * 
 * Actions:
 * - listings: Get marketplace listings
 * - subscribe: Subscribe to a strategy
 * - reviews: Get/submit reviews
 */

import { NextRequest, NextResponse } from "next/server";

const MARKETPLACE_ACTIONS = [
  "listings",
  "subscribe",
  "reviews",
] as const;

type MarketplaceAction = (typeof MARKETPLACE_ACTIONS)[number];

function isValidAction(action: string): action is MarketplaceAction {
  return MARKETPLACE_ACTIONS.includes(action as MarketplaceAction);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: MARKETPLACE_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (action) {
      case "listings": {
        const { GET: listingsHandler } = await import("@/app/api/marketplace/listings/route");
        return listingsHandler(request);
      }
      case "reviews": {
        const { GET: reviewsHandler } = await import("@/app/api/marketplace/reviews/route");
        return reviewsHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for GET" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/marketplace/${(await params).action}]`, error);
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
        { error: "Unknown action", validActions: MARKETPLACE_ACTIONS },
        { status: 400 }
      );
    }

    switch (action) {
      case "subscribe": {
        const { POST: subscribeHandler } = await import("@/app/api/marketplace/subscribe/route");
        return subscribeHandler(request);
      }
      case "reviews": {
        const { POST: reviewsHandler } = await import("@/app/api/marketplace/reviews/route");
        return reviewsHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Action not supported for POST" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/marketplace/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
