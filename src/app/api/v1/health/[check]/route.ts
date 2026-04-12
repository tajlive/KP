/**
 * API v1: Health Checks Consolidated Endpoint
 * 
 * Consolidates health check operations under /api/v1/health/[check]
 * 
 * Checks:
 * - general: General health check
 * - sonar: Sonar health check
 * - websocket: WebSocket health check
 */

import { NextRequest, NextResponse } from "next/server";

const HEALTH_CHECKS = [
  "general",
  "sonar",
  "websocket",
  "oauth",
] as const;

type HealthCheck = (typeof HEALTH_CHECKS)[number];

function isValidCheck(check: string): check is HealthCheck {
  return HEALTH_CHECKS.includes(check as HealthCheck);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ check: string }> }
) {
  try {
    const { check } = await params;
    
    if (!isValidCheck(check)) {
      return NextResponse.json(
        { error: "Unknown health check", validChecks: HEALTH_CHECKS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (check) {
      case "general": {
        const { GET: healthHandler } = await import("@/app/api/health/route");
        return healthHandler();
      }
      case "sonar": {
        const { GET: sonarHandler } = await import("@/app/api/health/sonar/route");
        return sonarHandler();
      }
      case "websocket": {
        const { GET: websocketHandler } = await import("@/app/api/health/websocket/route");
        return websocketHandler();
      }
      case "oauth": {
        const { GET: oauthHandler } = await import("@/app/api/health/oauth/route");
        return oauthHandler();
      }
      default:
        return NextResponse.json(
          { error: "Check not supported" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/health/${(await params).check}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
