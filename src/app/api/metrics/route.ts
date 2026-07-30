/**
 * Health Metrics — lightweight, no external dependencies.
 *
 * Returns process-level health data without any DB queries.
 * This guarantees sub-100ms response on Cloudflare Workers.
 * Use /api/health for the full DB-backed health check.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MetricPayload {
  timestamp: string;
  status: "healthy";
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number } | null;
  nodeVersion: string;
}

const startTime = Date.now();

export function GET(): NextResponse {
  const mem = typeof process !== "undefined" && process.memoryUsage
    ? (() => { const m = process.memoryUsage(); return { rss: m.rss, heapTotal: m.heapTotal, heapUsed: m.heapUsed }; })()
    : null;

  const payload: MetricPayload = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    uptime: Math.round((Date.now() - startTime) / 1000),
    memory: mem,
    nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=15, s-maxage=15" },
  });
}
