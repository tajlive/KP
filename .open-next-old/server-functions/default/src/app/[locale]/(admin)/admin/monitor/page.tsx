/**
 * Live Trading Monitor Dashboard
 * 
 * Real-time metrics:
 * - Trades per minute
 * - Login success rate
 * - System latency
 * - Active users
 * 
 * Uses Supabase Realtime for live updates
 * Security: Professor-tier only
 */

import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import { LoginRequired } from "@/shared/ui/LoginRequired";
import { AccessDenied } from "@/shared/ui/AccessDenied";
import { createServerClient } from "@/lib/supabase/server";
import { MonitorDashboardClient } from "./MonitorDashboardClient";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Monitor - Klarpakke",
    robots: { index: false, follow: false },
  };
}

async function checkAdminAccess() {
  const supabase = await createServerClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier")
      .eq("id", user.id)
      .single();
    
    return profile?.tier === "professor";
  } catch {
    return false;
  }
}

// Fetch initial metrics
async function getInitialMetrics() {
  const supabase = await createServerClient();
  
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Trades in last minute
    const { count: tradesLastMinute, error: e1 } = await supabase
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneMinuteAgo);
    
    // Trades in last 5 minutes
    const { count: tradesLast5Min, error: e2 } = await supabase
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fiveMinutesAgo);
    
    // Active users (using user_activity_logs)
    const { count: activeUsers, error: e3 } = await supabase
      .from("user_activity_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);
    
    // Recent trades
    const { data: recentTrades, error: e4 } = await supabase
      .from("trading_sessions")
      .select("id, status, created_at, total_pnl")
      .order("created_at", { ascending: false })
      .limit(50);
    
    // Calculate success rate
    const completedTrades = recentTrades?.filter((t: {status: string}) => t.status === "completed").length || 0;
    const totalTrades = recentTrades?.length || 1;
    
    return {
      timestamp: new Date().toISOString(),
      tradesPerMinute: tradesLastMinute || 0,
      tradesTrend: tradesLast5Min || 0,
      activeUsers: activeUsers || 0,
      successRate: (completedTrades / totalTrades) * 100,
      recentTrades: recentTrades || [],
      errors: {
        trades: e1?.message || e2?.message,
        users: e3?.message,
        recent: e4?.message,
      },
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      tradesPerMinute: 0,
      tradesTrend: 0,
      activeUsers: 0,
      successRate: 0,
      recentTrades: [],
      errors: { general: error instanceof Error ? error.message : "Unknown error" },
    };
  }
}

export default async function MonitorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user } = await requireAuth(locale);
  if (!user) {
    return <LoginRequired next={`/${locale}/admin/monitor`} />;
  }

  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    return <AccessDenied next={`/${locale}/admin/monitor`} />;
  }

  const initialMetrics = await getInitialMetrics();

  return <MonitorDashboardClient initialMetrics={initialMetrics} />;
}
