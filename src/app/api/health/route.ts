import { createClient } from "@/lib/supabase/server";
import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";
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

async function checkTradingSignals(): Promise<CheckResult> {
  const start = Date.now();
  const maxAgeMinutes = Number(
    process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ?? "20",
  );

  try {
    const supabase = createClient();
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
        message: "No trading signals found",
      };
    }

    const ageMinutes =
      (Date.now() - new Date(data.created_at).getTime()) / 60000;
    if (ageMinutes > maxAgeMinutes) {
      return {
        status: "warning",
        latency: Date.now() - start,
        message: `Latest signal is stale (${Math.round(ageMinutes)}m old)`,
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

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    tradingSignals: await checkTradingSignals(),
    kv: await checkKV(),
    environment: checkEnvironment(),
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
