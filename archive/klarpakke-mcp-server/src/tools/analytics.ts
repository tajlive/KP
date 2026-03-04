/**
 * Analytics Tools - Dashboard metrics and trends
 */

import { getSupabase, getUserCounts } from "../clients/supabase.ts";
import type { DashboardMetrics, ToolOutput } from "../types.ts";

export async function getDashboardMetrics(args: {
  time_range: string;
}): Promise<ToolOutput> {
  const supabase = getSupabase();
  const startTime = Date.now();

  try {
    const counts = await getUserCounts(args.time_range);

    // Calculate MRR (Monthly Recurring Revenue)
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("amount, status")
      .eq("status", "active");

    const mrr = (subscriptions || []).reduce(
      (sum, sub) => sum + (sub.amount || 0),
      0,
    );

    // Get active users (logged in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_active", weekAgo.toISOString());

    // Calculate conversion rate
    const { count: totalVisitors } = await supabase
      .from("signup_funnel")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view");

    const conversionRate =
      totalVisitors && totalVisitors > 0
        ? ((counts.total / totalVisitors) * 100).toFixed(2)
        : "0";

    const metrics: DashboardMetrics = {
      total_users: counts.total,
      signups_today: counts.today,
      signups_week: counts.week,
      signups_month: counts.month,
      active_users: activeUsers || 0,
      mrr: mrr,
      conversion_rate: parseFloat(conversionRate),
      timestamp: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text",
          text: `📊 Dashboard Metrics (${args.time_range})

👥 Users:
  • Total: ${metrics.total_users}
  • Today: ${metrics.signups_today} (+${((metrics.signups_today / Math.max(metrics.total_users, 1)) * 100).toFixed(1)}%)
  • This Week: ${metrics.signups_week}
  • This Month: ${metrics.signups_month}
  • Active (7d): ${metrics.active_users}

💰 Revenue:
  • MRR: ${metrics.mrr.toLocaleString("no-NO")} NOK

📈 Conversion:
  • Rate: ${metrics.conversion_rate}%
  
⏱️ Generated in ${Date.now() - startTime}ms`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error fetching metrics: ${error}` }],
      isError: true,
    };
  }
}

export async function getSignupTrend(args: {
  days: number;
}): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - args.days);

    const { data, error } = await supabase
      .from("beta_signups")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Aggregate by date
    const trends = new Map<string, number>();

    // Initialize all dates with 0
    for (let i = 0; i < args.days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      trends.set(key, 0);
    }

    // Count signups per date
    (data || []).forEach((signup) => {
      const date = signup.created_at.split("T")[0];
      trends.set(date, (trends.get(date) || 0) + 1);
    });

    // Sort by date
    const sortedTrends = Array.from(trends.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );

    const total = sortedTrends.reduce((sum, [, count]) => sum + count, 0);
    const avg = total / args.days;

    // Create simple ASCII chart
    const maxCount = Math.max(...sortedTrends.map(([, c]) => c), 1);
    const chart = sortedTrends
      .map(([date, count]) => {
        const bar = "█".repeat(Math.round((count / maxCount) * 20));
        const label = date.slice(5); // MM-DD
        return `${label} │${bar} ${count}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `📈 Signup Trend (Last ${args.days} Days)

Total: ${total} | Daily Avg: ${avg.toFixed(1)}

${chart}

${sortedTrends.map(([d, c]) => `${d}: ${c}`).join(", ")}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getTopUsers(args: {
  metric: string;
  limit: number;
}): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    let query;

    switch (args.metric) {
      case "trades":
        query = (
          supabase
            .from("trades")
            .select("user_id, count(*)")
            .range(0, args.limit) as any
        )
          .group("user_id")
          .order("count", { ascending: false })
          .limit(args.limit);
        break;

      case "referrals":
        query = supabase
          .from("profiles")
          .select("id, email, full_name, referral_count")
          .order("referral_count", { ascending: false })
          .limit(args.limit);
        break;

      case "klt":
        query = supabase
          .from("klt_balances")
          .select("user_id, balance, profiles(email, full_name)")
          .order("balance", { ascending: false })
          .limit(args.limit);
        break;

      default:
        return {
          content: [
            {
              type: "text",
              text: `❌ Unknown metric: ${args.metric}. Use: trades, referrals, or klt`,
            },
          ],
          isError: true,
        };
    }

    const { data, error } = await query;

    if (error) throw error;

    const users = (data || [])
      .map((u: any, idx: number) => {
        const value =
          args.metric === "trades"
            ? u.count
            : args.metric === "referrals"
              ? u.referral_count
              : u.balance;
        const name =
          u.full_name ||
          u.profiles?.full_name ||
          u.email ||
          u.user_id.slice(0, 8);
        return `${idx + 1}. ${name} - ${value} ${args.metric}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `🏆 Top ${args.limit} Users by ${args.metric.toUpperCase()}

${users || "No data found"}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getFunnelStats(): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from("signup_funnel")
      .select("event_type, step_number, session_id")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) throw error;

    const steps = [
      { name: "page_view", label: "Så påmeldingsside", step: 1 },
      { name: "form_start", label: "Startet utfylling", step: 2 },
      { name: "erfaring_selected", label: "Valgte erfaring", step: 3 },
      { name: "laeringsmaal_selected", label: "Valgte læringsmål", step: 4 },
      { name: "email_entered", label: "Skrev e-post", step: 5 },
      { name: "submit_attempted", label: "Prøvde å sende", step: 6 },
      { name: "success", label: "Fullførte", step: 7 },
    ];

    let output = "📊 Signup Funnel (Last 7 Days)\n\n";
    let prevCount = 0;

    steps.forEach((step, idx) => {
      const count = new Set(
        (data || [])
          .filter((s: any) => s.event_type === step.name)
          .map((s: any) => s.session_id),
      ).size;

      const dropOff = idx > 0 && prevCount > 0 ? prevCount - count : 0;
      const dropOffRate =
        idx > 0 && prevCount > 0
          ? ((dropOff / prevCount) * 100).toFixed(1)
          : "0";
      const bar = "█".repeat(
        Math.round((count / Math.max(prevCount || count, 1)) * 10),
      );

      output += `${step.step}. ${step.label}\n`;
      output += `   ${bar} ${count} users`;
      if (idx > 0) output += ` (-${dropOffRate}% dropoff)`;
      output += "\n\n";

      prevCount = count;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}
