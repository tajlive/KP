import { createClient } from "@/lib/supabase/server";
import { getUserDashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import type {
  CockpitMode,
  CockpitTab,
  CockpitInitialData,
  TradingSessionSummary,
} from "@/features/trading-cockpit/types";

export async function getCockpitInitialData(
  userId: string,
  requestedMode: string | null,
  requestedTab: string | null,
): Promise<CockpitInitialData> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("preferred_trading_mode, binance_connected, tier")
    .eq("id", userId)
    .single();

  const canUseLive = await verifyLiveEntitlement(supabase, userId);
  const storedMode =
    profile?.preferred_trading_mode === "live" ||
    profile?.preferred_trading_mode === "paper"
      ? profile.preferred_trading_mode
      : "paper";

  let mode: CockpitMode = storedMode;
  if (requestedMode === "paper" || requestedMode === "live") {
    mode = requestedMode;
  }
  if (mode === "live" && !canUseLive) {
    mode = "paper";
  }

  const tab: CockpitTab =
    requestedTab === "trades" || requestedTab === "analysis"
      ? requestedTab
      : "overview";

  const metrics = await getUserDashboardMetrics({
    supabaseClient: supabase,
    userId,
    mode,
    sessionScope: "all",
  });

  const { data: sessions } = await supabase
    .from("trading_sessions")
    .select(
      "id, status, mode, starting_capital_nok, current_capital_nok, total_pnl, trading_pair, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: statusRows } = await supabase.rpc(
    "trading_session_status_counts",
    {
      p_user_id: userId,
      p_mode: mode,
    },
  );

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows ?? []) {
    statusCounts[row.status] = Number(row.count);
  }

  return {
    mode,
    defaultMode: storedMode,
    tab,
    metrics,
    sessions: (sessions ?? []) as TradingSessionSummary[],
    statusCounts,
    canUseLive,
  };
}
