import { Client } from "pg";
import { setDefaultResultOrder } from "dns";
import { getRedisRest, isRedisRestConfigured } from "@/lib/redis-client";
import { NextResponse } from "next/server";

// Force IPv4 to avoid known Vercel↔Supabase IPv6 routing issues
setDefaultResultOrder("ipv4first");

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
  cached?: boolean;
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

function parsePgUrl(urlString: string) {
  const url = new URL(urlString);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6543,
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    // Supavisor pooler may require tenant identification via the
    // `options=reference=<project-ref>` query parameter. Preserve it.
    options: url.searchParams.get("options") || undefined,
  };
}

async function getPostgresClient(): Promise<Client> {
  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing POSTGRES_URL or DATABASE_URL");
  }
  // Parse connection string manually to avoid pg overriding ssl settings
  // from sslmode=require in the URL. Supavisor pooler uses AWS-managed
  // certs that Node.js may not trust — we accept them for health checks.
  const parsed = parsePgUrl(connectionString);
  const client = new Client({
    ...parsed,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  let client: Client | null = null;
  try {
    client = await getPostgresClient();
    const result = await client.query("SELECT 1 AS health");
    const ok = result.rows.length > 0 && result.rows[0].health === 1;
    await client.end();
    return {
      status: ok ? "ok" : "error",
      latency: Date.now() - start,
      message: ok ? undefined : "Unexpected query result",
    };
  } catch (err) {
    if (client) {
      try { await client.end(); } catch { /* ignore */ }
    }
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown DB error",
    };
  }
}

async function checkTradingSignals(): Promise<CheckResult> {
  const start = Date.now();
  let client: Client | null = null;
  const staleMinutes = Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ?? 15);
  const criticalMinutes = 60;
  const incidentMinutes = 120;

  try {
    client = await getPostgresClient();
    const result = await client.query(
      `SELECT last_heartbeat, updated_at, status, last_error
       FROM bot_health
       WHERE bot_name = 'signal-engine'
       LIMIT 1`
    );
    await client.end();

    const botRow = result.rows[0];
    const heartbeatAt = botRow?.last_heartbeat ?? botRow?.updated_at ?? null;

    if (botRow?.status === "error") {
      return {
        status: "error",
        latency: Date.now() - start,
        message: botRow.last_error?.slice(0, 200) ?? "signal-engine status error",
      };
    }

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
    if (client) {
      try { await client.end(); } catch { /* ignore */ }
    }
    return {
      status: "error",
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown trading check error",
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
    "POSTGRES_URL",
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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
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
    } catch { /* ignore cache errors */ }
  }

  // Return cached result immediately if fresh (< 25s old to avoid edge case)
  if (cached && Date.now() - new Date(cached.timestamp).getTime() < 25_000) {
    return NextResponse.json(
      { ...cached, cached: true },
      { status: cached.status === "unhealthy" ? 503 : 200 }
    );
  }

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

  const hasError = Object.values(checks).some((c) => c.status === "error");
  const hasWarning = Object.values(checks).some((c) => c.status === "warning");

  const status = hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy";

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    version:
      process.env.FLY_ALLOC_ID?.slice(0, 7) ||
      process.env.GITHUB_SHA?.slice(0, 7) ||
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
      "unknown",
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  const statusCode = status === "unhealthy" ? 503 : 200;

  // Cache result in Redis/Vercel KV
  if (isRedisRestConfigured()) {
    try {
      const redis = getRedisRest();
      await redis?.set(CACHE_KEY, JSON.stringify(health), {
        ex: CACHE_TTL_SECONDS,
      });
    } catch { /* ignore cache write errors */ }
  }

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
