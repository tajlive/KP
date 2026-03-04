import { getSupabase } from "../clients/supabase.ts";

/**
 * Check system health (Database, Logs, and Critical Processes)
 */
export async function checkSystemHealth() {
  const supabase = getSupabase();

  // Parallel health checks
  const [errorLogs, tradeLogs, subStatus] = await Promise.all([
    supabase
      .from("error_logs")
      .select("*")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .limit(5),
    supabase.from("auto_trading_trades").select("*").limit(1),
    supabase.from("user_subscriptions").select("count").limit(1),
  ]);

  const report = {
    database: !errorLogs.error && !tradeLogs.error ? "healthy" : "degraded",
    recent_errors: errorLogs.data?.length || 0,
    active_connections: !!subStatus.data,
    timestamp: new Date().toISOString(),
    recommendation:
      errorLogs.data && errorLogs.data.length > 2
        ? "Investigate recent error logs for potential service disruptions."
        : "System is operating within normal parameters.",
  };

  return {
    content: [
      {
        type: "text",
        text: `🏥 System Health Audit:\n${JSON.stringify(report, null, 2)}`,
      },
    ],
  };
}

/**
 * Get Growth Leaderboard (Top referrers)
 */
export async function getGrowthLeaderboard() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, referral_count")
    .order("referral_count", { ascending: false })
    .limit(10);

  if (error)
    return { content: [{ type: "text", text: error.message }], isError: true };

  return {
    content: [
      {
        type: "text",
        text: `Growth Leaderboard (Top 10 Referrers):\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/**
 * Audit security logs for suspicious activity
 */
export async function auditSecurityLogs(args: { limit?: number }) {
  const supabase = getSupabase();
  const limit = args.limit || 50;

  const { data, error } = await supabase
    .from("security_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error)
    return { content: [{ type: "text", text: error.message }], isError: true };

  return {
    content: [
      {
        type: "text",
        text: `Last ${limit} security events:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}
