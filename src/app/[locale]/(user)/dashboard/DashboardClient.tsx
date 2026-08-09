"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardContent, type DashboardCmsData } from "@/features/dashboard/DashboardContent";
import type { DashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import KrakenLiveCard from "@/features/kraken/KrakenLiveCard";
import { BestemorPanel } from "@/features/dashboard/BestemorPanel";

interface DashboardClientProps {
  locale: string;
}

interface ProfileResponse {
  ok: boolean;
  profile?: {
    id: string;
    display_name: string | null;
    paper_balance: number;
    tier: string | null;
    preferred_trading_mode: string | null;
    onboarding_completed: boolean | null;
    created_at: string | null;
    is_priority: boolean | null;
  };
  error?: string;
}

export default function DashboardClient({ locale }: DashboardClientProps) {
  const router = useRouter();
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    userId?: string;
    userName?: string;
    preferredTradingMode: "paper" | "live";
    onboardingCompleted: boolean;
    signupDays: number;
    cmsData: DashboardCmsData | null;
    metrics: DashboardMetrics | null;
    isPriority: boolean;
  }>({ loading: true, preferredTradingMode: "paper", onboardingCompleted: false, signupDays: 1, cmsData: null, metrics: null, isPriority: false });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const timeout = setTimeout(() => {
          if (!cancelled) setState(s => ({ ...s, loading: false, error: "Tidsavbrudd — prøv igjen" }));
        }, 10000);

        // Fetch profile via API (independent of AuthContext — avoids Supabase client hang)
        const profileRes = await fetch(`/api/user/profile`);
        if (profileRes.status === 401) {
          clearTimeout(timeout);
          router.push(`/${locale}/login?next=/${locale}/dashboard`);
          return;
        }

        const profileData: ProfileResponse = await profileRes.json();

        if (!profileData.ok || !profileData.profile) {
          clearTimeout(timeout);
          if (!cancelled) setState(s => ({ ...s, loading: false, error: profileData.error || "Kunne ikke laste profil" }));
          return;
        }

        const profile = profileData.profile;
        const preferredTradingMode = profile.preferred_trading_mode === "live" ? "live" : "paper";

        // Fetch metrics via API
        const metricsRes = await fetch(`/api/dashboard/metrics?userId=${profile.id}&mode=${preferredTradingMode}`);
        const metricsJson = metricsRes.ok ? await metricsRes.json() : null;
        const metrics = metricsJson?.ok ? (metricsJson.data as DashboardMetrics) : null;

        clearTimeout(timeout);

        if (!cancelled) {
          setState({
            loading: false,
            userId: profile.id,
            userName: profile.display_name ?? "",
            preferredTradingMode,
            onboardingCompleted: profile.onboarding_completed ?? false,
            signupDays: profile.created_at
              ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)))
              : 1,
            cmsData: null,
            metrics,
            isPriority: profile.is_priority ?? false,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Kunne ikke laste dashboard" }));
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [locale, router]);

  if (state.loading) {
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
          className="px-6 py-2 bg-[#0052FF] text-white rounded-lg font-bold"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <BestemorPanel sessionId={state.userId} />
      <KrakenLiveCard />
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
