import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";
import { BinanceMarketDataProvider } from "@/lib/trading/canonical/market-data/binance-provider";
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
    binanceConnectivity: BinanceConnectivityResult;
  };
  uptime: number;
  cached?: boolean;
}

const KNOWN_BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision",  // API-optimert — mindre sannsynlig geo-blokkert
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
  "https://testnet.binance.vision",
] as const;

// Binance probe: try via Supabase Edge Function proxy first (avoids Worker IP geo-block),
// then fall back to direct API calls.
const BINANCE_PROXY_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/binance-proxy`;
const BINANCE_DIRECT_TIMEOUT_MS = 5000;
const BINANCE_PROXY_TIMEOUT_MS = 8000;

interface BinanceConnectivityResult {
  status: "ok" | "degraded" | "error";
  primaryWorked: boolean;
  fallbackActive: boolean;
  endpointUsed?: string;
  message?: string;
}

interface CheckResult {
  status: "ok" | "error" | "warning";
  latency?: number;
  message?: string;
  details?: Record<string, string | number | boolean | null>;
}

const startTime = Date.now();
const CACHE_KEY = "health:latest";
const CACHE_TTL_SECONDS = 30;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();

  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("bot_health")
      .select("bot_name")
      .limit(1);

    if (error) {
      throw error;
    }

    return {
      status: "ok",
      latency: Date.now() - start,
    };
  } catch (err) {
    console.error("[Health] checkDatabase error:", err);
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : JSON.stringify(err),
    };
  }
}

async function checkTradingSignals(): Promise<CheckResult> {
  const start = Date.now();
  const staleMinutes = Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ?? 15);
  const criticalMinutes = 60;
  const incidentMinutes = 120;

  try {
    const supabase = getServiceClient();
    const { data: botRow, error } = await supabase
      .from("bot_health")
      .select("last_heartbeat, updated_at, status, last_error")
      .eq("bot_name", "signal-engine")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (botRow?.status === "error") {
      return {
        status: "error",
        latency: Date.now() - start,
        message:
          botRow.last_error?.slice(0, 200) ?? "signal-engine status error",
      };
    }

    const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;

    if (!heartbeatAt) {
      return {
        status: "warning",
        latency: Date.now() - start,
        message: "No signal-engine heartbeat row found",
      };
    }

    const hbAgeMin = (Date.now() - new Date(heartbeatAt).getTime()) / 60000;

    if (hbAgeMin > staleMinutes) {
      return {
        status: "warning",
        latency: Date.now() - start,
        message: `Signal engine heartbeat stale (${Math.round(hbAgeMin)}m old)`,
        details: {
          engineHeartbeatAgeMinutes: Number(hbAgeMin.toFixed(2)),
          staleThresholdMinutes: staleMinutes,
          criticalThresholdMinutes: criticalMinutes,
          incidentThresholdMinutes: incidentMinutes,
        },
      };
    }

    return {
      status: "ok",
      latency: Date.now() - start,
      message: `Heartbeat ${Math.round(hbAgeMin)}m old`,
      details: {
        engineHeartbeatAgeMinutes: Number(hbAgeMin.toFixed(2)),
        staleThresholdMinutes: staleMinutes,
        criticalThresholdMinutes: criticalMinutes,
        incidentThresholdMinutes: incidentMinutes,
      },
    };
  } catch (err) {
    console.error("[Health] checkTradingSignals error:", err);
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : JSON.stringify(err),
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

async function checkBinanceConnectivity(): Promise<BinanceConnectivityResult> {
  // Bruk Binance proxy direkte — raskere enn 7-endpoint-kjede på Worker
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/binance-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        "X-Binance-Proxy-Secret": process.env.BINANCE_PROXY_SECRET || "",
      },
      body: JSON.stringify({
        action: "publicApi",
        apiKey: "public",
        apiSecret: "public",
        publicApiPath: "/api/v3/ticker/price?symbol=BTCUSDT",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const payload = await res.json();
      if (payload.ok) {
        return {
          status: "ok",
          primaryWorked: false,
          fallbackActive: true,
          endpointUsed: "binance-proxy",
        };
      }
    }

    return {
      status: "error",
      primaryWorked: false,
      fallbackActive: false,
      endpointUsed: "binance-proxy",
      message: `Proxy returned ${res.status}`,
    };
  } catch (err) {
    return {
      status: "error",
      primaryWorked: false,
      fallbackActive: false,
      message: err instanceof Error ? err.message : "Unknown proxy error",
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

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]).catch(() => fallback);
}

export async function GET() {
  const start = Date.now();

  // Try cache first
  let cached: HealthCheck | null = null;
  if (isRedisRestConfigured()) {
    try {
      const redis = getRedisRest();
      const raw = await redis?.get<string>(CACHE_KEY);
      if (raw) {
        cached = JSON.parse(raw);
      }
    } catch {
      /* ignore cache errors */
    }
  }

  // Return cached result immediately if fresh (< 25s old to avoid edge case)
  if (cached && Date.now() - new Date(cached.timestamp).getTime() < 25_000) {
    return NextResponse.json(
      { ...cached, cached: true },
      { status: cached.status === "unhealthy" ? 503 : 200 },
    );
  }

  // Run all checks in parallel with individual 3s timeouts
  const [database, tradingSignals, kv, environment, binanceConnectivity] =
    await Promise.all([
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
      withTimeout(checkBinanceConnectivity(), 25000, {
        status: "error" as const,
        primaryWorked: false,
        fallbackActive: false,
        message: "Check timed out after 15000ms",
      }),
    ]);

  const checks = {
    database,
    tradingSignals,
    kv,
    environment,
    binanceConnectivity,
  };

  const { binanceConnectivity: _, ...statusChecks } = checks;
  const hasError = Object.values(statusChecks).some(
    (c) => c.status === "error",
  );
  const hasWarning = Object.values(statusChecks).some(
    (c) => c.status === "warning",
  );

  const status = hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy";

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version:
      process.env.APP_VERSION?.slice(0, 7) ||
      process.env.SOURCE_COMMIT?.slice(0, 7) ||
      process.env.COOLIFY_COMMIT_SHA?.slice(0, 7) ||
      process.env.GITHUB_SHA?.slice(0, 7) ||
      "unknown",
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  const statusCode = status === "unhealthy" ? 503 : 200;

  // Cache result in Redis (legacy KV provider removed)
  if (isRedisRestConfigured()) {
    try {
      const redis = getRedisRest();
      await redis?.set(CACHE_KEY, JSON.stringify(health), {
        ex: CACHE_TTL_SECONDS,
      });
    } catch {
      /* ignore cache write errors */
    }
  }

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
