"use client";

import { useAuth } from "@/lib/auth/new/AuthContext";
import { usePulseData } from "@/hooks/usePulseData";
import { PresetProfileId } from "@/lib/auto-trading/preset-profiles";
import { ChartTimeframe, PulseMode } from "@/types/pulse";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PulseHeaderStats } from "./PulseHeaderStats";
import { PulseModeToggle } from "./PulseModeToggle";
import { PulseRiskCards } from "./PulseRiskCards";
import { PulseTimeframeTabs } from "./PulseTimeframeTabs";

// Import types for dynamic components
import type { PulseChartProps } from "./PulseChart";
import type { PulseEventFeedProps } from "./PulseEventFeed";

// Lazy load heavy components
const PulseChart = dynamic<PulseChartProps>(
  () => import("@/features/dashboard/pulse/PulseChart").then((mod) => mod.PulseChart),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  },
);

const PulseEventFeed = dynamic<PulseEventFeedProps>(
  () => import("./PulseEventFeed").then((mod) => mod.PulseEventFeed),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-center text-slate-500">Laster hendelser...</div>
    ),
  },
);

export function PulseChartContainer() {
  const { user } = useAuth();
  const [mode, setMode] = useState<PulseMode>("paper");
  const [profileId, setProfileId] = useState<PresetProfileId>("moderat");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1D");

  const { data, events, stats, isLoading, isConnected, error } = usePulseData({
    userId: user?.id || null,
    mode,
    profileId,
    timeframe,
  });

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-4xl overflow-hidden shadow-2xl flex flex-col h-full">
      <PulseHeaderStats
        portfolioValue={stats.portfolioValue}
        dailyChangeNok={stats.dailyChangeNok}
        dailyChangePct={stats.dailyChangePct}
        mode={mode}
        isConnected={isConnected}
      />

      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PulseModeToggle mode={mode} onModeChange={setMode} />
          <div className="flex items-center gap-3">
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value as PresetProfileId)}
              title="Velg risikoprofil"
              className="bg-slate-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer hover:bg-slate-800 transition-colors"
            >
              <option value="forsiktig">FORSIKTIG</option>
              <option value="moderat">MODERAT</option>
              <option value="aggressiv">AGGRESSIV</option>
            </select>
            <PulseTimeframeTabs
              activeTimeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </div>
        </div>

        <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5">
          <PulseChart
            data={data}
            events={events}
            profileId={profileId}
            isLoading={isLoading}
          />
        </div>

        <PulseRiskCards profileId={profileId} />

        <PulseEventFeed events={events} />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            Kunne ikke laste puls-data. Vennligst prøv igjen senere.
          </div>
        )}
      </div>
    </div>
  );
}
