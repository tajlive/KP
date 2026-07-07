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

const COCKPIT_CACHE_TTL_MS = 30_000; // 30 sec SWR cache for cockpit data

interface CockpitCacheEntry {
  data: CockpitInitialData;
  timestamp: number;
}

const cockpitCache = new Map<string, CockpitCacheEntry>();

function cockpitCacheKey(userId: string, mode: string, tab: string): string {
  return `${userId}:${mode}:${tab}`;
}

export async function getCockpitInitialData(
  userId: string,
  requestedMode: string | null,
  requestedTab: string | null,
): Promise<CockpitInitialData> {
  const supabase = createClient();

  // ── Phase 1: Fetch independent data in parallel ──
  const [profileResult, canUseLive, autoSettingsResult, dailyLossResult] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("preferred_trading_mode, binance_connected, tier")
        .eq("id", userId)
        .single(),
      verifyLiveEntitlement(supabase, userId),
      supabase
        .from("auto_trade_settings")
        .select("auto_trading_enabled, risk_profile, daily_loss_limit_percent")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("check_daily_loss_limit", { p_user_id: userId }),
    ]);

  const profile = profileResult.data;
  const autoTradeSettings = autoSettingsResult.data;
  const dailyLossCheck = dailyLossResult.data;

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

  // ── Cache check for mode-dependent data ──
  const cacheKey = cockpitCacheKey(userId, mode, tab);
  const cached = cockpitCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < COCKPIT_CACHE_TTL_MS) {
    return cached.data;
  }

  // ── Phase 2: Fetch mode-dependent data in parallel ──
  const [metricsResult, sessionsResult, statusResult] = await Promise.all([
    getUserDashboardMetrics({
      supabaseClient: supabase,
      userId,
      mode,
      sessionScope: "all",
    }),
    supabase
      .from("trading_sessions")
      .select(
        "id, status, mode, starting_capital_nok, current_capital_nok, total_pnl, max_drawdown_pct, trading_pair, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("mode", mode)
      .is("archived", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.rpc("trading_session_status_counts", {
      p_user_id: userId,
      p_mode: mode,
    }),
  ]);

  const metrics = metricsResult;
  const sessions = (sessionsResult.data ?? []) as unknown as TradingSessionSummary[];
  const rawSessionData = sessionsResult.data ?? [];

  const statusCounts: Record<string, number> = {};
  for (const row of (statusResult.data ?? []) as Array<{ status: string; count: number }>) {
    statusCounts[row.status] = Number(row.count);
  }

  const mappedAutoTradeSettings = autoTradeSettings
    ? {
        auto_trading_enabled: autoTradeSettings.auto_trading_enabled ?? false,
        risk_profile: autoTradeSettings.risk_profile ?? null,
      }
    : null;

  const dailyLossLimitReached = dailyLossCheck?.[0]?.should_stop ?? false;

  const drawdownThresholdPercent =
    autoTradeSettings?.daily_loss_limit_percent ??
    DEFAULT_DAILY_LOSS_LIMIT_PERCENT;

  const riskStatus = computeRiskStatus(
    dailyLossLimitReached,
    rawSessionData as { max_drawdown_pct: number | null }[],
    drawdownThresholdPercent,
  );
  riskStatus.crashed = (statusCounts.crashed ?? 0) > 0;

  const result: CockpitInitialData = {
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

  // Cache the result for 30 seconds
  cockpitCache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
}
