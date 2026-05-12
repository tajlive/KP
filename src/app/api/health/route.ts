import { createClient } from "@/lib/supabase/server";
import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";
import {
  DATA_SOURCE_THRESHOLDS,
  getTradingFeedState,
} from "@/lib/trading/data-source-state";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    tradingSignals: CheckResult;
    kv: CheckResult;
    environment: CheckResult;
  };
  uptime: number;
}

interface CheckResult {
  status: "ok" | "error" | "warning";
  latency?: number;
  message?: string;
  details?: Record<string, string | number | boolean | null>;
}

const startTime = Date.now();

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_profiles")
      .select("id")
      .limit(1);

    if (error) {
      return {
        status: "error",
        latency: Date.now() - start,
        message: error.message,
      };
    }

    return {
      status: "ok",
      latency: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Signal-feed health: prefer `bot_health` heartbeat for `signal-engine`.
 * New rows in `trading_signals` are only inserted on BUY/SELL — long gaps are
 * normal when strategies are HOLD. Cron still updates `last_heartbeat` each run.
 */
async function checkTradingSignals(): Promise<CheckResult> {
  const start = Date.now();
  const staleMinutes = Number(
    process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ??
      DATA_SOURCE_THRESHOLDS.staleMinutes,
  );
  const criticalMinutes = DATA_SOURCE_THRESHOLDS.criticalMinutes;
  const incidentMinutes = DATA_SOURCE_THRESHOLDS.incidentMinutes;

  try {
    const supabase = createClient();

    const { data: botRow, error: botErr } = await supabase
      .from("bot_health")
      .select("last_heartbeat, updated_at, status, last_error")
      .eq("bot_name", "signal-engine")
      .maybeSingle();

    const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;

    if (!botErr && botRow && heartbeatAt) {
      const hbAgeMin = (Date.now() - new Date(heartbeatAt).getTime()) / 60000;

      if (botRow.status === "error") {
        return {
          status: "error",
          latency: Date.now() - start,
          message:
            botRow.last_error?.slice(0, 200) ?? "signal-engine status error",
        };
      }

      if (hbAgeMin > staleMinutes) {
        const feedStateHint = getTradingFeedState({
          hasError: false,
          usesFallback: false,
          latestSignalAgeMinutes: null,
        });
        return {
          status: "warning",
          latency: Date.now() - start,
          message: `Signal engine heartbeat stale (${Math.round(hbAgeMin)}m old)`,
          details: {
            feedStateHint,
            engineHeartbeatAgeMinutes: Number(hbAgeMin.toFixed(2)),
            latestSignalAgeMinutes: null,
            staleThresholdMinutes: staleMinutes,
            criticalThresholdMinutes: criticalMinutes,
            incidentThresholdMinutes: incidentMinutes,
          },
        };
      }

      const { data: feedRow } = await supabase
        .from("trading_signals")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let message: string | undefined;
      let latestSignalAgeMinutes: number | null = null;
      let holdLikely = false;
      if (feedRow?.created_at) {
        const feedAgeMin =
          (Date.now() - new Date(feedRow.created_at).getTime()) / 60000;
        latestSignalAgeMinutes = Number(feedAgeMin.toFixed(2));
        if (feedAgeMin > staleMinutes) {
          holdLikely = true;
          message = `Engine OK; latest feed row ${Math.round(feedAgeMin)}m old (normal during HOLD)`;
        }
      } else {
        message = "Engine OK; no rows in trading_signals yet";
      }

      const feedStateHint = getTradingFeedState({
        hasError: false,
        usesFallback: false,
        latestSignalAgeMinutes,
      });

      return {
        status: "ok",
        latency: Date.now() - start,
        message,
        details: {
          feedStateHint,
          holdLikely,
          engineHeartbeatAgeMinutes: Number(hbAgeMin.toFixed(2)),
          latestSignalAgeMinutes,
          staleThresholdMinutes: staleMinutes,
          criticalThresholdMinutes: criticalMinutes,
          incidentThresholdMinutes: incidentMinutes,
        },
      };
    }

    // Fallback: no bot_health row yet (legacy) — infer from trading_signals only
    const { data, error } = await supabase
      .from("trading_signals")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        status: "error",
        latency: Date.now() - start,
        message: error.message,
      };
    }

    if (!data?.created_at) {
      return {
        status: "warning",
        latency: Date.now() - start,
        message: "No trading signals and no signal-engine heartbeat",
      };
    }

    const ageMinutes =
      (Date.now() - new Date(data.created_at).getTime()) / 60000;
    if (ageMinutes > staleMinutes) {
      const roundedAge = Number(ageMinutes.toFixed(2));
      return {
        status: "warning",
        latency: Date.now() - start,
        message: `Latest signal is stale (${Math.round(ageMinutes)}m old); no bot_health for signal-engine`,
        details: {
          feedStateHint: getTradingFeedState({
            hasError: false,
            usesFallback: false,
            latestSignalAgeMinutes: roundedAge,
          }),
          engineHeartbeatAgeMinutes: null,
          latestSignalAgeMinutes: roundedAge,
          staleThresholdMinutes: staleMinutes,
          criticalThresholdMinutes: criticalMinutes,
          incidentThresholdMinutes: incidentMinutes,
        },
      };
    }

    return {
      status: "ok",
      latency: Date.now() - start,
      details: {
        feedStateHint: getTradingFeedState({
          hasError: false,
          usesFallback: false,
          latestSignalAgeMinutes: Number(ageMinutes.toFixed(2)),
        }),
        engineHeartbeatAgeMinutes: null,
        latestSignalAgeMinutes: Number(ageMinutes.toFixed(2)),
        staleThresholdMinutes: staleMinutes,
        criticalThresholdMinutes: criticalMinutes,
        incidentThresholdMinutes: incidentMinutes,
      },
    };
  } catch (err) {
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkKV(): Promise<CheckResult> {
  const start = Date.now();

  if (!isRedisRestConfigured()) {
    return {
      status: "warning",
      message:
        "Redis REST not configured (optional; UPSTASH_REDIS_REST_* or KV_REST_*)",
    };
  }

  const redis = getRedisRest();
  if (!redis) {
    return {
      status: "warning",
      message: "Redis REST client unavailable",
    };
  }

  try {
    const probe = Date.now();
    await redis.set("health:check", probe, { ex: 60 });
    const value = await redis.get<number>("health:check");

    const ok = value != null && Number(value) === probe;
    return {
      status: ok ? "ok" : "error",
      latency: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function checkEnvironment(): CheckResult {
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    return {
      status: "error",
      message: `Missing env vars: ${missing.join(", ")}`,
    };
  }

  return { status: "ok" };
}

// Wrapper to enforce per-check timeout (prevents one slow check from killing the whole endpoint)
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]).catch(() => fallback);
}

export async function GET() {
  // Run all checks in parallel with individual 3s timeouts
  const [database, tradingSignals, kv, environment] = await Promise.all([
    withTimeout(checkDatabase(), 3000, {
      status: "error" as const,
      message: "Check timed out after 3000ms",
    }),
    withTimeout(checkTradingSignals(), 3000, {
      status: "error" as const,
      message: "Check timed out after 3000ms",
    }),
    withTimeout(checkKV(), 3000, {
      status: "warning" as const,
      message: "Check timed out after 3000ms",
    }),
    Promise.resolve(checkEnvironment()),
  ]);

  const checks = {
    database,
    tradingSignals,
    kv,
    environment,
  };

  // Determine overall status
  const hasError = Object.values(checks).some((c) => c.status === "error");
  const hasWarning = Object.values(checks).some((c) => c.status === "warning");

  const status = hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy";

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown",
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  const statusCode = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
