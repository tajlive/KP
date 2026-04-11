/**
 * API v1: Stats Consolidated Endpoint
 * 
 * Consolidates stats operations under /api/v1/stats/[metric]
 * 
 * Metrics:
 * - general: General stats
 * - users: User stats
 */

import { NextRequest, NextResponse } from "next/server";

const STATS_METRICS = [
  "general",
  "users",
] as const;

type StatsMetric = (typeof STATS_METRICS)[number];

function isValidMetric(metric: string): metric is StatsMetric {
  return STATS_METRICS.includes(metric as StatsMetric);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ metric: string }> }
) {
  try {
    const { metric } = await params;
    
    if (!isValidMetric(metric)) {
      return NextResponse.json(
        { error: "Unknown metric", validMetrics: STATS_METRICS },
        { status: 400 }
      );
    }

    // Delegate to existing handlers
    switch (metric) {
      case "general": {
        const { GET: statsHandler } = await import("@/app/api/stats/route");
        return statsHandler();
      }
      case "users": {
        const { GET: usersHandler } = await import("@/app/api/stats/users/route");
        return usersHandler();
      }
      default:
        return NextResponse.json(
          { error: "Metric not supported" },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error(`[v1/stats/${(await params).metric}]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
