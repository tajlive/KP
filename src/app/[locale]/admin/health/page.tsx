/**
 * Health Dashboard - Live Trading Stability
 * 
 * Real-time metrics for:
 * - Active sessions
 * - trades performance
 * - Database latency
 * - Vercel Speed Insights
 * 
 * Security: Professor-tier only
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { HealthDashboardClient } from "./HealthDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "System Health - Klarpakke",
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

// Fetch initial health data
async function getHealthData() {
  const supabase = await createServerClient();
  
  try {
    const startTime = Date.now();
    
    // Active users (last 15 minutes) - using user_activity_logs
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: activeUsers, error: sessionError } = await supabase
      .from("user_activity_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fifteenMinutesAgo);
    
    // Auto trades (last hour) - using trading_sessions
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentTrades, error: tradeError } = await supabase
      .from("trading_sessions")
      .select("id, status, created_at, total_pnl")
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(100);
    
    // Database latency
    const dbLatency = Date.now() - startTime;
    
    // Total trades today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: totalTradesToday, error: countError } = await supabase
      .from("trading_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    
    return {
      timestamp: new Date().toISOString(),
      activeUsers: activeUsers || 0,
      recentTrades: recentTrades || [],
      dbLatency,
      totalTradesToday: totalTradesToday || 0,
      errors: {
        sessions: sessionError?.message,
        trades: tradeError?.message,
        count: countError?.message,
      },
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      activeUsers: 0,
      recentTrades: [],
      dbLatency: 0,
      totalTradesToday: 0,
      errors: { general: error instanceof Error ? error.message : "Unknown error" },
    };
  }
}

export default async function HealthDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAdmin = await checkAdminAccess();

  if (!isAdmin) {
    redirect(`/${locale}/login?next=/${locale}/admin/health`);
  }
  
  const initialData = await getHealthData();
  
  return <HealthDashboardClient initialData={initialData} />;
}
