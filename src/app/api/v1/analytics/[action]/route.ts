/**
 * API v1: Analytics & Tracking Consolidated Endpoint
 * 
 * Consolidates analytics operations under /api/v1/analytics/[action]
 * 
 * Actions:
 * - track: Page/screen tracking
 * - event: Event tracking
 * - funnel: Funnel tracking
 * - click: Click tracking
 * - open: Email open tracking
 */

import { NextRequest, NextResponse } from "next/server";

const ANALYTICS_ACTIONS = [
  "track",
  "event",
  "funnel",
  "click",
  "open",
] as const;

type AnalyticsAction = (typeof ANALYTICS_ACTIONS)[number];

function isValidAction(action: string): action is AnalyticsAction {
  return ANALYTICS_ACTIONS.includes(action as AnalyticsAction);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: ANALYTICS_ACTIONS },
        { status: 400 }
      );
    }

    // Delegate to appropriate handler
    switch (action) {
      case "track": {
        const { POST: trackHandler } = await import("@/app/api/analytics/track/route");
        return trackHandler(request);
      }
      case "event": {
        const { POST: eventHandler } = await import("@/app/api/analytics/event/route");
        return eventHandler(request);
      }
      case "funnel": {
        const { POST: funnelHandler } = await import("@/app/api/track/funnel/route");
        return funnelHandler(request);
      }
      case "click": {
        // click only has GET
        return NextResponse.json(
          { error: "click only supports GET" },
          { status: 405 }
        );
      }
      case "open": {
        // open only has GET
        return NextResponse.json(
          { error: "open only supports GET" },
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
    console.error(`[v1/analytics/${(await params).action}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    
    if (!isValidAction(action)) {
      return NextResponse.json(
        { error: "Unknown action", validActions: ANALYTICS_ACTIONS },
        { status: 400 }
      );
    }

    // The base /api/analytics GET delegates to event
    if (action === "event" || action === "track") {
      const { GET: analyticsHandler } = await import("@/app/api/analytics/route");
      return analyticsHandler();
    }

    return NextResponse.json(
      { error: "Action not supported for GET" },
      { status: 405 }
    );
  } catch (error) {
    console.error(`[v1/analytics/GET]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
