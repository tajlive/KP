"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCockpitUrlSync } from "@/features/trading-cockpit/hooks/useCockpitUrlSync";
import { useCockpitRealtime } from "@/features/trading-cockpit/hooks/useCockpitRealtime";
import { DEFAULT_FILTERS } from "@/features/trading-cockpit/constants";
import type {
  CockpitError,
  CockpitFilters,
  CockpitInitialData,
  CockpitMode,
  CockpitRiskStatus,
  CockpitTab,
  DashboardMetrics,
  Trade,
  TradingAnalytics,
  TradingSessionSummary,
} from "@/features/trading-cockpit/types";

const SESSIONS_LIMIT = 20;
const TRADES_LIMIT = 25;

interface State {
  mode: CockpitMode;
  activeTab: CockpitTab;
  metrics: DashboardMetrics;
  sessions: TradingSessionSummary[];
  statusCounts: Record<string, number>;
  riskStatus: CockpitRiskStatus;
  canUseLive: boolean;
  autoTradeSettings: CockpitInitialData["autoTradeSettings"];
  isLoading: boolean;
  error: CockpitError | null;
  hasMoreSessions: boolean;
  sessionsCursor: string | null;
  analytics: TradingAnalytics | null;
  analyticsKey: string | null;
  filters: CockpitFilters;
  trades: Trade[];
  tradesCursor: string | null;
  hasMoreTrades: boolean;
  isLoadingTrades: boolean;
  tradesError: CockpitError | null;
  unreadTradeCount: number;
}

type Action =
  | { type: "SET_URL"; mode: CockpitMode; tab: CockpitTab }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: CockpitInitialData }
  | { type: "FETCH_ERROR"; error: CockpitError }
  | { type: "LOAD_MORE_START" }
  | {
      type: "LOAD_MORE_SUCCESS";
      sessions: TradingSessionSummary[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  | { type: "LOAD_MORE_ERROR"; error: CockpitError }
  | { type: "SET_ANALYTICS"; analytics: TradingAnalytics; key: string }
  | { type: "SET_ANALYTICS_ERROR"; error: CockpitError }
  | { type: "INVALIDATE_ANALYTICS" }
  | { type: "SET_FILTERS"; filters: Partial<CockpitFilters> }
  | { type: "RESET_FILTERS" }
  | { type: "FETCH_TRADES_START" }
  | {
      type: "FETCH_TRADES_SUCCESS";
      trades: Trade[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  | { type: "FETCH_TRADES_ERROR"; error: CockpitError }
  | { type: "LOAD_MORE_TRADES_START" }
  | {
      type: "LOAD_MORE_TRADES_SUCCESS";
      trades: Trade[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  | { type: "LOAD_MORE_TRADES_ERROR"; error: CockpitError }
  | { type: "INCREMENT_UNREAD_TRADES" }
  | { type: "MARK_TRADES_SEEN" }
  | { type: "REFRESH_METRICS"; metrics: DashboardMetrics };

function buildSessionsCursor(sessions: TradingSessionSummary[]): string | null {
  if (sessions.length < SESSIONS_LIMIT) return null;
  return sessions[sessions.length - 1]?.id ?? null;
}

function buildHasMore(sessions: TradingSessionSummary[]): boolean {
  return sessions.length >= SESSIONS_LIMIT;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_URL":
      return { ...state, mode: action.mode, activeTab: action.tab };
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        mode: action.payload.mode,
        activeTab: action.payload.tab,
        metrics: action.payload.metrics,
        sessions: action.payload.sessions,
        statusCounts: action.payload.statusCounts,
        riskStatus: action.payload.riskStatus,
        canUseLive: action.payload.canUseLive,
        autoTradeSettings: action.payload.autoTradeSettings,
        isLoading: false,
        error: null,
        hasMoreSessions: buildHasMore(action.payload.sessions),
        sessionsCursor: buildSessionsCursor(action.payload.sessions),
      };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "LOAD_MORE_START":
      return { ...state, isLoading: true, error: null };
    case "LOAD_MORE_SUCCESS":
      return {
        ...state,
        sessions: [...state.sessions, ...action.sessions],
        hasMoreSessions: action.hasMore,
        sessionsCursor: action.nextCursor,
        isLoading: false,
        error: null,
      };
    case "LOAD_MORE_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "SET_ANALYTICS":
      return {
        ...state,
        analytics: action.analytics,
        analyticsKey: action.key,
      };
    case "SET_ANALYTICS_ERROR":
      return { ...state, error: action.error };
    case "INVALIDATE_ANALYTICS":
      return { ...state, analyticsKey: null };
    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.filters },
        tradesCursor: null,
        hasMoreTrades: false,
      };
    case "RESET_FILTERS":
      return {
        ...state,
        filters: DEFAULT_FILTERS,
        tradesCursor: null,
        hasMoreTrades: false,
      };
    case "FETCH_TRADES_START":
      return { ...state, isLoadingTrades: true, tradesError: null };
    case "FETCH_TRADES_SUCCESS":
      return {
        ...state,
        trades: action.trades,
        tradesCursor: action.nextCursor,
        hasMoreTrades: action.hasMore,
        isLoadingTrades: false,
        tradesError: null,
      };
    case "FETCH_TRADES_ERROR":
      return { ...state, isLoadingTrades: false, tradesError: action.error };
    case "LOAD_MORE_TRADES_START":
      return { ...state, isLoadingTrades: true, tradesError: null };
    case "LOAD_MORE_TRADES_SUCCESS":
      return {
        ...state,
        trades: [...state.trades, ...action.trades],
        tradesCursor: action.nextCursor,
        hasMoreTrades: action.hasMore,
        isLoadingTrades: false,
        tradesError: null,
      };
    case "LOAD_MORE_TRADES_ERROR":
      return { ...state, isLoadingTrades: false, tradesError: action.error };
    case "INCREMENT_UNREAD_TRADES":
      return { ...state, unreadTradeCount: state.unreadTradeCount + 1 };
    case "MARK_TRADES_SEEN":
      return { ...state, unreadTradeCount: 0 };
    case "REFRESH_METRICS":
      return { ...state, metrics: action.metrics };
    default:
      return state;
  }
}

function createInitialState(data: CockpitInitialData): State {
  return {
    mode: data.mode,
    activeTab: data.tab,
    metrics: data.metrics,
    sessions: data.sessions,
    statusCounts: data.statusCounts,
    riskStatus: data.riskStatus,
    canUseLive: data.canUseLive,
    autoTradeSettings: data.autoTradeSettings,
    isLoading: false,
    error: null,
    hasMoreSessions: buildHasMore(data.sessions),
    sessionsCursor: buildSessionsCursor(data.sessions),
    analytics: null,
    analyticsKey: null,
    filters: DEFAULT_FILTERS,
    trades: [],
    tradesCursor: null,
    hasMoreTrades: false,
    isLoadingTrades: false,
    tradesError: null,
    unreadTradeCount: 0,
  };
}

interface TradingCockpitProviderProps {
  children: ReactNode;
  initialData: CockpitInitialData;
  userId: string;
  locale: string;
}

export interface CockpitContextValue {
  mode: CockpitMode;
  tab: CockpitTab;
  metrics: DashboardMetrics;
  sessions: TradingSessionSummary[];
  statusCounts: Record<string, number>;
  riskStatus: CockpitRiskStatus;
  canUseLive: boolean;
  autoTradeSettings: CockpitInitialData["autoTradeSettings"];
  isLoading: boolean;
  error: CockpitError | null;
  analytics: TradingAnalytics | null;
  filters: CockpitFilters;
  trades: Trade[];
  hasMoreTrades: boolean;
  isLoadingTrades: boolean;
  tradesError: CockpitError | null;
  hasMoreSessions: boolean;
  lastTickAt: string | null;
  setMode: (mode: CockpitMode) => void;
  setTab: (tab: CockpitTab) => void;
  refresh: () => Promise<void>;
  loadMoreSessions: () => Promise<void>;
  setFilters: (filters: Partial<CockpitFilters>) => void;
  resetFilters: () => void;
  loadTrades: () => Promise<void>;
  loadMoreTrades: () => Promise<void>;
  markTradesAsSeen: () => void;
  unreadTradeCount: number;
}

const TradingCockpitContext = createContext<CockpitContextValue | null>(null);

export function TradingCockpitProvider({
  children,
  initialData,
  userId,
  locale,
}: TradingCockpitProviderProps) {
  const {
    mode: urlMode,
    tab: urlTab,
    hasModeParam,
    hasTabParam,
    updateUrl,
  } = useCockpitUrlSync();
  const t = useTranslations("trading");
  const [state, dispatch] = useReducer(
    reducer,
    initialData,
    createInitialState,
  );

  const currentModeRef = useRef(state.mode);
  const currentTabRef = useRef(state.activeTab);
  const filtersRef = useRef(state.filters);

  useEffect(() => {
    currentModeRef.current = state.mode;
  }, [state.mode]);

  useEffect(() => {
    currentTabRef.current = state.activeTab;
  }, [state.activeTab]);

  useEffect(() => {
    filtersRef.current = state.filters;
  }, [state.filters]);

  // Sync external URL changes into state.
  // 2026-08-10 (QA P1): Manglende URL-param = «ingen preferanse» — behold
  // server-modus fra initialData (profilens preferred_trading_mode). Uten
  // denne guarden tvang defaulten («paper») state tilbake mens dataene
  // var hentet for live → badge sa Lekepenger, tallene var live.
  useEffect(() => {
    const nextMode = hasModeParam ? urlMode : state.mode;
    const nextTab = hasTabParam ? urlTab : state.activeTab;
    if (nextMode !== state.mode || nextTab !== state.activeTab) {
      dispatch({ type: "SET_URL", mode: nextMode, tab: nextTab });
    }
  }, [urlMode, urlTab, hasModeParam, hasTabParam, state.mode, state.activeTab]);

  const setMode = useCallback(
    (mode: CockpitMode) => {
      updateUrl({ mode });
    },
    [updateUrl],
  );

  const setTab = useCallback(
    (tab: CockpitTab) => {
      updateUrl({ tab });
    },
    [updateUrl],
  );

  const fetchInitialData = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await fetch(
        `/api/trading-cockpit/initial?mode=${currentModeRef.current}&tab=${currentTabRef.current}&locale=${locale}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      const data = (await res.json()) as CockpitInitialData;
      dispatch({ type: "FETCH_SUCCESS", payload: data });
    } catch (err) {
      dispatch({
        type: "FETCH_ERROR",
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          code: "FETCH_FAILED",
        },
      });
    }
  }, [locale]);

  const refresh = useCallback(async () => {
    await fetchInitialData();
  }, [fetchInitialData]);

  const loadMoreSessions = useCallback(async () => {
    if (!state.sessionsCursor) return;
    dispatch({ type: "LOAD_MORE_START" });
    try {
      const params = new URLSearchParams({
        mode: currentModeRef.current,
        cursor: state.sessionsCursor,
        limit: String(SESSIONS_LIMIT),
      });
      const res = await fetch(
        `/api/trading-cockpit/sessions?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      const data = (await res.json()) as {
        sessions: TradingSessionSummary[];
        next_cursor: string | null;
      };
      dispatch({
        type: "LOAD_MORE_SUCCESS",
        sessions: data.sessions,
        nextCursor: data.next_cursor,
        hasMore: data.sessions.length >= SESSIONS_LIMIT,
      });
    } catch (err) {
      dispatch({
        type: "LOAD_MORE_ERROR",
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          code: "LOAD_MORE_FAILED",
        },
      });
    }
  }, [state.sessionsCursor]);

  const fetchTrades = useCallback(
    async (cursor: string | null, isLoadMore: boolean) => {
      const filters = filtersRef.current;
      const params = new URLSearchParams();
      params.set("mode", currentModeRef.current);
      params.set("limit", String(TRADES_LIMIT));
      if (cursor) params.set("cursor", cursor);
      if (filters.dateRange !== "all")
        params.set("dateRange", filters.dateRange);
      if (filters.pair) params.set("pair", filters.pair);
      if (filters.sessionStatus !== "all")
        params.set("sessionStatus", filters.sessionStatus);
      if (filters.side !== "all") params.set("side", filters.side);
      if (filters.tradeStatus !== "all")
        params.set("status", filters.tradeStatus);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(
        `/api/trading-cockpit/trades?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      return res.json() as Promise<{
        trades: Trade[];
        next_cursor: string | null;
      }>;
    },
    [],
  );

  const loadTrades = useCallback(async () => {
    dispatch({ type: "FETCH_TRADES_START" });
    try {
      const data = await fetchTrades(null, false);
      dispatch({
        type: "FETCH_TRADES_SUCCESS",
        trades: data.trades,
        nextCursor: data.next_cursor,
        hasMore: data.trades.length >= TRADES_LIMIT,
      });
    } catch (err) {
      dispatch({
        type: "FETCH_TRADES_ERROR",
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          code: "FETCH_TRADES_FAILED",
        },
      });
    }
  }, [fetchTrades]);

  const loadMoreTrades = useCallback(async () => {
    if (!state.tradesCursor) return;
    dispatch({ type: "LOAD_MORE_TRADES_START" });
    try {
      const data = await fetchTrades(state.tradesCursor, true);
      dispatch({
        type: "LOAD_MORE_TRADES_SUCCESS",
        trades: data.trades,
        nextCursor: data.next_cursor,
        hasMore: data.trades.length >= TRADES_LIMIT,
      });
    } catch (err) {
      dispatch({
        type: "LOAD_MORE_TRADES_ERROR",
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          code: "LOAD_MORE_TRADES_FAILED",
        },
      });
    }
  }, [fetchTrades, state.tradesCursor]);

  const setFilters = useCallback((filters: Partial<CockpitFilters>) => {
    dispatch({ type: "SET_FILTERS", filters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: "RESET_FILTERS" });
  }, []);

  const invalidateAnalytics = useCallback(() => {
    dispatch({ type: "INVALIDATE_ANALYTICS" });
  }, []);

  const handleTradeInsert = useCallback(
    (trade: Trade) => {
      dispatch({ type: "INCREMENT_UNREAD_TRADES" });
      const sideLabel =
        trade.side === "buy"
          ? t("cockpit.trades.side.buy")
          : t("cockpit.trades.side.sell");
      toast.success(t("cockpit.realtime.newTrade.title"), {
        description: t("cockpit.realtime.newTrade.description", {
          side: sideLabel,
          symbol: trade.trading_pair,
        }),
        duration: 4000,
      });
    },
    [t],
  );

  const markTradesAsSeen = useCallback(() => {
    dispatch({ type: "MARK_TRADES_SEEN" });
  }, []);

  // ── 5-second polling for live KPI updates (lightweight — no loading state) ──
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/trading-cockpit/metrics?mode=${currentModeRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.metrics) {
          dispatch({ type: "REFRESH_METRICS", metrics: data.metrics });
        }
      } catch {
        // silently ignore poll errors
      }
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeSession = useMemo(() => {
    const candidates = state.sessions.filter(
      (s) => s.mode === state.mode && s.status === "active",
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, s) => {
      const latestTime = latest.last_tick_at ?? latest.updated_at;
      const sTime = s.last_tick_at ?? s.updated_at;
      return sTime > latestTime ? s : latest;
    }, candidates[0]);
  }, [state.sessions, state.mode]);

  const lastTickAt = activeSession?.last_tick_at ?? null;

  const handleSessionUpdate = useCallback(
    (updatedSession: TradingSessionSummary) => {
      const previousSession = state.sessions.find(
        (s) => s.id === updatedSession.id,
      );
      if (!previousSession) return;
      if (previousSession.status === updatedSession.status) return;

      const statusKey =
        updatedSession.status === "active"
          ? "cockpit.sessions.status.active"
          : updatedSession.status === "paused"
            ? "cockpit.sessions.status.paused"
            : updatedSession.status === "stopped"
              ? "cockpit.sessions.status.stopped"
              : "cockpit.sessions.status.crashed";

      const description = updatedSession.last_status_message
        ? t("cockpit.toast.sessionStatusChanged.description", {
            status: t(statusKey),
            message: updatedSession.last_status_message,
          })
        : t("cockpit.toast.sessionStatusChanged.descriptionNoMessage", {
            status: t(statusKey),
          });

      toast.info(t("cockpit.toast.sessionStatusChanged.title"), {
        description,
        duration: 5000,
      });
    },
    [state.sessions, t],
  );

  // Load trades whenever the active tab becomes trades or filters/mode change while on trades.
  useEffect(() => {
    if (state.activeTab !== "trades") return;

    let cancelled = false;
    const run = async () => {
      dispatch({ type: "FETCH_TRADES_START" });
      try {
        const data = await fetchTrades(null, false);
        if (cancelled) return;
        dispatch({
          type: "FETCH_TRADES_SUCCESS",
          trades: data.trades,
          nextCursor: data.next_cursor,
          hasMore: data.trades.length >= TRADES_LIMIT,
        });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          type: "FETCH_TRADES_ERROR",
          error: {
            message: err instanceof Error ? err.message : "Unknown error",
            code: "FETCH_TRADES_FAILED",
          },
        });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [state.activeTab, state.filters, state.mode, fetchTrades]);

  // Load analytics whenever the active tab becomes analysis or filters/mode change while on analysis.
  useEffect(() => {
    if (state.activeTab !== "analysis") return;

    const key = `${state.mode}:${state.filters.dateRange}:${state.filters.pair ?? ""}:${state.filters.sessionStatus}:${state.filters.side}:${state.filters.tradeStatus}:${state.filters.search}`;
    if (key === state.analyticsKey) return;

    let cancelled = false;
    const run = async () => {
      const filters = filtersRef.current;
      const params = new URLSearchParams();
      params.set("mode", currentModeRef.current);
      params.set("dateRange", filters.dateRange);
      if (filters.pair) params.set("pair", filters.pair);
      if (filters.sessionStatus !== "all")
        params.set("sessionStatus", filters.sessionStatus);
      if (filters.side !== "all") params.set("side", filters.side);
      if (filters.tradeStatus !== "all")
        params.set("status", filters.tradeStatus);
      if (filters.search) params.set("search", filters.search);

      try {
        const res = await fetch(
          `/api/trading-cockpit/analytics?${params.toString()}`,
          {
            cache: "no-store",
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || res.statusText);
        }
        const data = (await res.json()) as { analytics: TradingAnalytics };
        if (cancelled) return;
        dispatch({ type: "SET_ANALYTICS", analytics: data.analytics, key });
      } catch (err) {
        if (cancelled) return;
        dispatch({
          type: "SET_ANALYTICS_ERROR",
          error: {
            message: err instanceof Error ? err.message : "Unknown error",
            code: "FETCH_ANALYTICS_FAILED",
          },
        });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [state.activeTab, state.filters, state.mode, state.analyticsKey]);

  useCockpitRealtime({
    userId,
    mode: state.mode,
    activeTab: state.activeTab,
    onRefresh: refresh,
    onRefreshTrades: loadTrades,
    onInvalidateAnalytics: invalidateAnalytics,
    onTradeInsert: handleTradeInsert,
    onSessionUpdate: handleSessionUpdate,
    enabled: !state.isLoading,
  });

  const value = useMemo<CockpitContextValue>(
    () => ({
      mode: state.mode,
      tab: state.activeTab,
      metrics: state.metrics,
      sessions: state.sessions,
      statusCounts: state.statusCounts,
      riskStatus: state.riskStatus,
      canUseLive: state.canUseLive,
      autoTradeSettings: state.autoTradeSettings,
      isLoading: state.isLoading,
      error: state.error,
      analytics: state.analytics,
      filters: state.filters,
      trades: state.trades,
      hasMoreTrades: state.hasMoreTrades,
      isLoadingTrades: state.isLoadingTrades,
      tradesError: state.tradesError,
      unreadTradeCount: state.unreadTradeCount,
      hasMoreSessions: state.hasMoreSessions,
      lastTickAt,
      setMode,
      setTab,
      refresh,
      loadMoreSessions,
      setFilters,
      resetFilters,
      loadTrades,
      loadMoreTrades,
      markTradesAsSeen,
    }),
    [
      state,
      lastTickAt,
      setMode,
      setTab,
      refresh,
      loadMoreSessions,
      setFilters,
      resetFilters,
      loadTrades,
      loadMoreTrades,
      markTradesAsSeen,
    ],
  );

  return (
    <TradingCockpitContext.Provider value={value}>
      {children}
    </TradingCockpitContext.Provider>
  );
}

export function useCockpitContext(): CockpitContextValue {
  const ctx = useContext(TradingCockpitContext);
  if (!ctx) {
    throw new Error(
      "useCockpitContext must be used within a TradingCockpitProvider",
    );
  }
  return ctx;
}
