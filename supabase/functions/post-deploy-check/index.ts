/**
 * Post-Deploy Health Check Edge Function
 * 
 * Runs after deployment to verify critical systems:
 * - Active sessions
 * - Database connectivity
 * - auto_trades table health
 * - Edge function status
 * 
 * Trigger: HTTP GET/POST
 * Auth: Requires CRON_SECRET or service key
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface HealthCheckResult {
  timestamp: string;
  status: "healthy" | "degraded" | "critical";
  checks: {
    database: {
      status: "ok" | "error";
      latency_ms: number;
      active_sessions?: number;
      message?: string;
    };
    auto_trades: {
      status: "ok" | "warning" | "error";
      count: number;
      recent_trades?: number;
      message?: string;
    };
    auth: {
      status: "ok" | "error";
      provider_status?: Record<string, boolean>;
      message?: string;
    };
  };
  alerts: string[];
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function createResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function runHealthCheck(supabase: ReturnType<typeof createClient>): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    checks: {
      database: { status: "ok", latency_ms: 0 },
      auto_trades: { status: "ok", count: 0 },
      auth: { status: "ok" },
    },
    alerts: [],
  };

  // Check 1: Database connectivity and active sessions
  const dbStart = Date.now();
  try {
    // Get active sessions from auth
    const { data: sessions, error: sessionError } = await supabase
      .from("user_sessions")
      .select("id", { count: "exact" })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    result.checks.database.latency_ms = Date.now() - dbStart;

    if (sessionError) {
      throw sessionError;
    }

    result.checks.database.status = "ok";
    result.checks.database.active_sessions = sessions?.length ?? 0;

    // Alert if no sessions in 24h (might indicate auth issues)
    if (result.checks.database.active_sessions === 0) {
      result.alerts.push("No active sessions in last 24 hours - potential auth issue");
      result.checks.database.status = "warning";
    }

  } catch (error) {
    result.checks.database.status = "error";
    result.checks.database.latency_ms = Date.now() - dbStart;
    result.checks.database.message = error instanceof Error ? error.message : "Database error";
    result.alerts.push(`Database check failed: ${result.checks.database.message}`);
  }

  // Check 2: auto_trades table health
  try {
    const { count: totalTrades, error: countError } = await supabase
      .from("auto_trades")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    result.checks.auto_trades.count = totalTrades ?? 0;

    // Check for recent trades (last hour)
    const { count: recentTrades, error: recentError } = await supabase
      .from("auto_trades")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentError) {
      throw recentError;
    }

    result.checks.auto_trades.recent_trades = recentTrades ?? 0;

    // Determine status
    if (result.checks.auto_trades.count === 0) {
      result.checks.auto_trades.status = "warning";
      result.checks.auto_trades.message = "No auto_trades records found";
      result.alerts.push("auto_trades table is empty - trading may not be functioning");
    } else if (result.checks.auto_trades.recent_trades === 0) {
      result.checks.auto_trades.status = "warning";
      result.checks.auto_trades.message = "No trades in last hour";
      result.alerts.push("No recent auto_trades - check trading scheduler");
    } else {
      result.checks.auto_trades.status = "ok";
    }

  } catch (error) {
    result.checks.auto_trades.status = "error";
    result.checks.auto_trades.message = error instanceof Error ? error.message : "auto_trades error";
    result.alerts.push(`auto_trades check failed: ${result.checks.auto_trades.message}`);
  }

  // Check 3: Auth provider status (via settings check)
  try {
    const { data: authSettings, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      throw authError;
    }

    result.checks.auth.status = "ok";

    // Note: Full provider check requires admin access
    // This is a basic connectivity check

  } catch (error) {
    result.checks.auth.status = "error";
    result.checks.auth.message = error instanceof Error ? error.message : "Auth error";
    result.alerts.push(`Auth check failed: ${result.checks.auth.message}`);
  }

  // Determine overall status
  const errorCount = Object.values(result.checks).filter(c => c.status === "error").length;
  const warningCount = Object.values(result.checks).filter(c => c.status === "warning").length;

  if (errorCount > 0) {
    result.status = "critical";
  } else if (warningCount > 0) {
    result.status = "degraded";
  }

  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate authentication
  const authHeader = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedCronSecret = Deno.env.get("CRON_SECRET");

  let isAuthorized = false;

  // Check CRON_SECRET
  if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
    isAuthorized = true;
  }

  // Check service key authorization
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey && token === serviceKey) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return createResponse(
      { error: "Unauthorized - requires CRON_SECRET or service key" },
      401
    );
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return createResponse(
      { error: "Missing Supabase environment variables" },
      500
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Parse request body for options
    let options: { alertThreshold?: string } = {};
    if (req.method === "POST") {
      try {
        options = await req.json();
      } catch {
        // Ignore parse errors, use defaults
      }
    }

    // Run health check
    const result = await runHealthCheck(supabase);

    // Send alerts if critical
    if (result.status === "critical" && options.alertThreshold !== "none") {
      const slackWebhook = Deno.env.get("SLACK_DEPLOY_WEBHOOK");
      if (slackWebhook) {
        try {
          await fetch(slackWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "🚨 Klarpakke Post-Deploy Check CRITICAL",
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: "🚨 Post-Deploy Check Failed",
                    emoji: true,
                  },
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: result.alerts.map(a => `• ${a}`).join("\n"),
                  },
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*Status:* ${result.status.toUpperCase()}\n*Time:* ${result.timestamp}`,
                  },
                },
              ],
            }),
          });
        } catch (e) {
          console.error("Failed to send Slack alert:", e);
        }
      }
    }

    // Return appropriate status code
    const statusCode = result.status === "critical" ? 503 : result.status === "degraded" ? 200 : 200;
    
    return createResponse(result, statusCode);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Health check error:", error);
    
    return createResponse(
      {
        timestamp: new Date().toISOString(),
        status: "critical",
        error: message,
      },
      500
    );
  }
});
