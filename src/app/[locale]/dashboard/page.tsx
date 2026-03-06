import UnifiedTradingDashboard from "@/components/trading/UnifiedTradingDashboard";
import GetStartedCard from "@/components/dashboard/GetStartedCard";
import { requireAuth } from "@/lib/auth-guard";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('dashboard.title', { defaultValue: 'Dashboard - Klarpakke' }),
    description: t('dashboard.description', { defaultValue: 'Ditt personlige dashboard for krypto-trading med paper trading, live trading og porteføljeanalyse.' }),
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { supabase, user } = await requireAuth(locale);

  const [portfolioRes, tradesRes, strategiesRes, progressRes] = await Promise.all([
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
      .eq("is_active", true),
    supabase
      .from("onboarding_progress")
      .select("completed_lessons")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Parse completed lessons from JSON
  const completedLessons = progressRes.data?.completed_lessons ?? [];

  return (
    <>
      {/* Kom i gang for nye brukere – KLA-73 */}
      <GetStartedCard
        userId={user.id}
        completedLessons={completedLessons}
      />
      
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
    </>
  );
}
