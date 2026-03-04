import { requireAuth } from "@/lib/auth-guard";
import { Suspense } from "react";
import UnifiedTradingDashboard from "@/components/trading/UnifiedTradingDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);

  const [portfolioRes, tradesRes, strategiesRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, user_id, paper_balance, real_balance, tier")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("user_strategies")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 p-6 space-y-6 animate-pulse">
          <div className="h-12 bg-gray-800 rounded-lg w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-48 bg-gray-800 rounded-xl" />
            <div className="h-48 bg-gray-800 rounded-xl" />
            <div className="h-48 bg-gray-800 rounded-xl" />
          </div>
        </div>
      }
    >
      <UnifiedTradingDashboard
        initialPortfolio={portfolioRes.data}
        initialTrades={tradesRes.data ?? []}
        initialStrategies={strategiesRes.data ?? []}
        userId={user.id}
      />
    </Suspense>
  );
}
