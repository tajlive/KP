/**
 * @file src/app/api/dashboard/metrics/route.ts
 * @description Unified dashboard-metrics endpoint.
 *
 * Query params:
 *   mode          - "paper" | "live"            (default: "paper")
 *   sessionScope  - "all" | "active" | "active_and_completed"
 *                                              (default: "active")
 *
 * Response shape:
 *   { ok: true, data: DashboardMetrics }
 *   { ok: false, error: { code, message } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getUserDashboardMetrics,
  DashboardMetricsError,
  type DashboardMode,
  type SessionScope,
  type DashboardMetrics,
} from "@/server/dashboard/getUserDashboardMetrics";
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit";
import { withCache, CACHE_TTL } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache";
import * as Sentry from "@/lib/sentry";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  mode: z.enum(["paper", "live"]).default("paper"),
  sessionScope: z
    .enum(["all", "active", "active_and_completed"])
    .default("active"),
});

export interface DashboardMetricsSuccessResponse {
  ok: true;
  data: DashboardMetrics;
}

export interface DashboardMetricsErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type DashboardMetricsResponse =
  | DashboardMetricsSuccessResponse
  | DashboardMetricsErrorResponse;

export async function GET(
  request: NextRequest,
): Promise<NextResponse<DashboardMetricsResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // ── 1. Rate limiting ─────────────────────────────────────────────
    const limited = await rateLimitMiddleware(request);
    if (limited) {
      return limited as NextResponse<DashboardMetricsResponse>;
    }

    // ── 2. Auth ──────────────────────────────────────────────────────
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized. Please provide a valid authentication token.",
          },
        },
        { status: 401 },
      );
    }

    // ── 3. Parse query ───────────────────────────────────────────────
    const searchParams = request.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      mode: searchParams.get("mode") ?? undefined,
      sessionScope: searchParams.get("sessionScope") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_FAILED",
            message: `Invalid query parameters: ${parsed.error.message}`,
          },
        },
        { status: 400 },
      );
    }

    const { mode, sessionScope } = parsed.data;

    // ── 4. Cached aggregation ────────────────────────────────────────
    const cacheKey = cacheKeys.portfolio(user.id)
      + `:${mode}:${sessionScope}`;

    const metrics = await withCache(
      cacheKey,
      async () =>
        getUserDashboardMetrics({
          supabaseClient: supabase,
          userId: user.id,
          mode: mode as DashboardMode,
          sessionScope: sessionScope as SessionScope,
        }),
      15 * 1000, // 15 seconds — trading data changes frequently, keep it fresh
    );

    const durationMs = Date.now() - startTime;

    // ── 5. Structured logging ────────────────────────────────────────
    // ── 6. Warn if slow ──────────────────────────────────────────────
    if (durationMs > 1000) {
      Sentry.captureMessage(
        `Dashboard metrics aggregation slow (${durationMs}ms)`,
        "warning",
      );
    }

    const response: DashboardMetricsSuccessResponse = {
      ok: true,
      data: metrics,
    };

    return NextResponse.json(response, {
      headers: {
        "X-Request-Id": requestId,
        "X-Response-Time-Ms": String(durationMs),
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(
      `[dashboard-metrics] ERROR requestId=${requestId} durationMs=${durationMs}:`,
      error,
    );

    Sentry.captureException(error, {
      tags: {
        endpoint: "dashboard-metrics",
        requestId,
        type: "endpoint_error",
      },
      extra: {
        responseTimeMs: durationMs,
        errorMessage: errorMsg,
        errorName: error instanceof Error ? error.name : "unknown",
      },
    });

    if (error instanceof DashboardMetricsError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DASHBOARD_METRICS_FAILED",
          message: errorMsg,
        },
      },
      { status: 500 },
    );
  }
}
