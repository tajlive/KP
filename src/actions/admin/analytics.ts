"use server";

import { createClient } from "@/lib/supabase/server";

export interface DashboardMetrics {
  total_users: number;
  signups_today: number;
  signups_week: number;
  signups_month: number;
  active_users: number;
  mrr: number;
  conversion_rate: number;
}

/**
 * Get Dashboard Metrics
 * Replaces MCP `getDashboardMetrics`
 */
export async function getDashboardMetrics(
  timeRange: string = "7d",
): Promise<{ success: boolean; data?: DashboardMetrics; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const ADMIN_EMAILS = ["tomarnejensen@gmail.com", "admin@klarpakke.no"];
    const isWhitelisted = ADMIN_EMAILS.includes(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!isWhitelisted && profile?.role !== "admin") {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    // 1. Get User Counts
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: signupsToday } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: signupsWeek } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const { count: signupsMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString());

    // 2. Active Users (Last 7 days)
    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_sign_in_at", weekAgo.toISOString()); // Using last_sign_in_at as proxy for active

    // 3. Calculate MRR (Monthly Recurring Revenue)
    // Assuming 'subscriptions' table has 'amount' and 'status'
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("amount")
      .eq("status", "active");

    const mrr = (subscriptions || []).reduce(
      (sum, sub) => sum + (sub.amount || 0),
      0,
    );

    // 4. Conversion Rate (Page View -> Signup)
    // Simplification: Total Users / Total 'page_view' in funnel (if exists)
    // For now, we might not have the full funnel data populated, so we default to a safe 0 or calculate from available data.
    const { count: funnelViews } = await supabase
      .from("signup_funnel")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view");

    const conversionRate =
      funnelViews && funnelViews > 0
        ? ((totalUsers || 0) / funnelViews) * 100
        : 0;

    return {
      success: true,
      data: {
        total_users: totalUsers || 0,
        signups_today: signupsToday || 0,
        signups_week: signupsWeek || 0,
        signups_month: signupsMonth || 0,
        active_users: activeUsers || 0,
        mrr,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

/**
 * Get Signup Trend
 * Replaces MCP `getSignupTrend`
 */
export async function getSignupTrend(days: number = 30) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const ADMIN_EMAILS = ["tomarnejensen@gmail.com", "admin@klarpakke.no"];
    const isWhitelisted = ADMIN_EMAILS.includes(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!isWhitelisted && profile?.role !== "admin") {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Aggregate by date
    const trends: Record<string, number> = {};

    // Initialize dates
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trends[d.toISOString().split("T")[0]] = 0;
    }

    data?.forEach((user) => {
      const date = user.created_at.split("T")[0];
      if (trends[date] !== undefined) {
        trends[date]++;
      }
    });

    // Convert to array for Chart.js
    const chartData = Object.entries(trends)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return { success: true, data: chartData };
  } catch (error) {
    console.error("Error fetching signup trend:", error);
    return { success: false, error: "Failed to fetch trends" };
  }
}
