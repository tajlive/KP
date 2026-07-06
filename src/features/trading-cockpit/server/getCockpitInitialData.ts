import { createClient } from "@/lib/supabase/server";
import { getUserDashboardMetrics } from "@/server/dashboard/getUserDashboardMetrics";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";
import type {
  CockpitMode,
  CockpitTab,
  CockpitInitialData,
  CockpitRiskStatus,
  TradingSessionSummary,
} from "@/features/trading-cockpit/types";

const DEFAULT_DAILY_LOSS_LIMIT_PERCENT = 5;

function computeRiskStatus(
  dailyLossLimitReached: boolean,
  sessions: { max_drawdown_pct: number | null }[],
  drawdownThresholdPercent: number,
): CockpitRiskStatus {
  const maxDrawdownReached = sessions.some((session) => {
    if (session.max_drawdown_pct == null) return false;
    return Math.abs(session.max_drawdown_pct) >= drawdownThresholdPercent;
  });

  return {
    dailyLossLimitReached: dailyLossLimitReached,
    maxDrawdownReached,
    crashed: false,
  };
}

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

  const { data: rawSessions } = await supabase
    .from("trading_sessions")
    .select(
      "id, status, mode, starting_capital_nok, current_capital_nok, total_pnl, max_drawdown_pct, trading_pair, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("mode", mode)
    .is("archived", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const sessions = (rawSessions ?? []) as unknown as TradingSessionSummary[];

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

  const { data: autoTradeSettings } = await supabase
    .from("auto_trade_settings")
    .select("auto_trading_enabled, risk_profile, daily_loss_limit_percent")
    .eq("user_id", userId)
    .maybeSingle();

  const mappedAutoTradeSettings = autoTradeSettings
    ? {
        auto_trading_enabled: autoTradeSettings.auto_trading_enabled ?? false,
        risk_profile: autoTradeSettings.risk_profile ?? null,
      }
    : null;

  const { data: dailyLossCheck } = await supabase.rpc(
    "check_daily_loss_limit",
    { p_user_id: userId },
  );
  const dailyLossLimitReached = dailyLossCheck?.[0]?.should_stop ?? false;

  const drawdownThresholdPercent =
    autoTradeSettings?.daily_loss_limit_percent ??
    DEFAULT_DAILY_LOSS_LIMIT_PERCENT;

  const riskStatus = computeRiskStatus(
    dailyLossLimitReached,
    rawSessions ?? [],
    drawdownThresholdPercent,
  );
  riskStatus.crashed = (statusCounts.crashed ?? 0) > 0;

  return {
    mode,
    defaultMode: storedMode,
    tab,
    metrics,
    sessions,
    statusCounts,
    riskStatus,
    canUseLive,
    autoTradeSettings: mappedAutoTradeSettings,
  };
}
