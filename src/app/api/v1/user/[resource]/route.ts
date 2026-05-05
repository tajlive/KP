/**
 * API v1: User Data Consolidated Endpoint
 * 
 * Consolidates user data operations under /api/v1/user/[resource]
 * 
 * Resources:
 * - trades: User trades
 * - trading-diagnostics: Trading diagnostics
 * - trading-analytics: Trading analytics
 */

import { NextRequest, NextResponse } from "next/server";

const USER_RESOURCES = [
  "trades",
  "trading-diagnostics",
  "trading-analytics",
] as const;

type UserResource = (typeof USER_RESOURCES)[number];

function isValidResource(resource: string): resource is UserResource {
  return USER_RESOURCES.includes(resource as UserResource);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    
    if (!isValidResource(resource)) {
      return NextResponse.json(
        { error: "Unknown resource", validResources: USER_RESOURCES },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (resource) {
      case "trades": {
        const { GET: tradesHandler } = await import("@/app/api/user/trades/route");
        return tradesHandler(request);
      }
      case "trading-diagnostics": {
        const { GET: diagnosticsHandler } = await import("@/app/api/user/trading-diagnostics/route");
        return diagnosticsHandler(request);
      }
      case "trading-analytics": {
        const { GET: analyticsHandler } = await import("@/app/api/user/trading-analytics/route");
        return analyticsHandler(request);
      }
      default:
        return NextResponse.json(
          { error: "Resource not supported" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/user/${(await params).resource}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
