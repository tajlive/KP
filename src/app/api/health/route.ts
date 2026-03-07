import { createClient } from "@/lib/supabase/server";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
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
    const supabase = await createClient();
    const { error } = await supabase.from("user_profiles").select("id").limit(1);
    
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

async function checkKV(): Promise<CheckResult> {
  const start = Date.now();
  
  // Check if KV is configured
  const isKVEnabled =
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    
  if (!isKVEnabled) {
    return {
      status: "warning",
      message: "KV not configured (optional)",
    };
  }
  
  try {
    await kv.set("health:check", Date.now(), { ex: 60 });
    const value = await kv.get("health:check");
    
    return {
      status: value ? "ok" : "error",
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
