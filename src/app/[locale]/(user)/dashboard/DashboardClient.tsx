"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/new/AuthContext";
import { DashboardContent, type DashboardCmsData } from "@/features/dashboard/DashboardContent";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getUserDashboardMetrics, type DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import { dashboardContentQuery } from "@/lib/sanity/queries";

interface DashboardClientProps {
  locale: string;
}

export default function DashboardClient({ locale }: DashboardClientProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    userId?: string;
    userName?: string;
    preferredTradingMode: "paper" | "live";
    onboardingCompleted: boolean;
    signupDays: number;
    cmsData?: DashboardCmsData | null;
    metrics?: DashboardMetrics | null;
    isPriority: boolean;
  }>({ loading: true, preferredTradingMode: "paper", onboardingCompleted: false, signupDays: 1, cmsData: null, metrics: null, isPriority: false });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/${locale}/login?next=/${locale}/dashboard`);
      return;
    }

    const load = async () => {
      try {
        const timeout = setTimeout(() => setState(s => ({ ...s, loading: false, error: "Tidsavbrudd" })), 15000);
        const supabase = getSupabaseClient();

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("paper_balance, tier, preferred_trading_mode, onboarding_completed, display_name, created_at, is_priority")
          .eq("id", user.id)
          .single();

        const preferredTradingMode = profile?.preferred_trading_mode === "live" ? "live" : "paper";

        let cmsData = null;
        try {
          const { client: sanityClient } = await import("@/lib/sanity/client");
          cmsData = await sanityClient.fetch(dashboardContentQuery, { language: locale });
        } catch { /* Sanity not configured */ }

        const metrics = await getUserDashboardMetrics({
          supabaseClient: supabase as never,
          userId: user.id,
          mode: preferredTradingMode,
          sessionScope: "active_and_completed",
        });

        clearTimeout(timeout);
        setState({
          loading: false,
          userId: user.id,
          userName: profile?.display_name ?? "",
          preferredTradingMode,
          onboardingCompleted: profile?.onboarding_completed ?? false,
          signupDays: profile?.created_at
            ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)))
            : 1,
          cmsData,
          metrics,
          isPriority: profile?.is_priority ?? false,
        });
      } catch (e) {
        setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Unknown error" }));
      }
    };
    load();
  }, [user, authLoading, locale, router]);

  if (authLoading || state.loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Laster...</div>
      </div>
    );
  }

  if (state.error || !state.userId) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-xl font-bold text-white">Det oppstod en feil</h2>
        <p className="text-slate-400">{state.error ?? "Kunne ikke laste dashboard"}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[#0066FF] text-white rounded-lg font-bold"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <DashboardContent
        userId={state.userId}
        preferredTradingMode={state.preferredTradingMode}
        onboardingCompleted={state.onboardingCompleted}
        userName={state.userName}
        signupDays={state.signupDays}
        cmsData={state.cmsData}
        metrics={state.metrics}
        isPriority={state.isPriority}
      />
    </div>
  );
}
