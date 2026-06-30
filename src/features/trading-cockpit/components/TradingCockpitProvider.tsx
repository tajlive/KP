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
import { useCockpitUrlSync } from "@/features/trading-cockpit/hooks/useCockpitUrlSync";
import { DEFAULT_FILTERS } from "@/features/trading-cockpit/constants";
import type {
  CockpitError,
  CockpitFilters,
  CockpitInitialData,
  CockpitMode,
  CockpitTab,
  DashboardMetrics,
  TradingAnalytics,
  TradingSessionSummary,
} from "@/features/trading-cockpit/types";

const SESSIONS_LIMIT = 20;

interface State {
  mode: CockpitMode;
  activeTab: CockpitTab;
  metrics: DashboardMetrics;
  sessions: TradingSessionSummary[];
  statusCounts: Record<string, number>;
  canUseLive: boolean;
  isLoading: boolean;
  error: CockpitError | null;
  hasMoreSessions: boolean;
  sessionsCursor: string | null;
  analytics: TradingAnalytics | null;
  analyticsKey: string | null;
  filters: CockpitFilters;
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
  | { type: "SET_ANALYTICS"; analytics: TradingAnalytics; key: string };

function buildSessionsCursor(
  sessions: TradingSessionSummary[],
): string | null {
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
        canUseLive: action.payload.canUseLive,
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
    canUseLive: data.canUseLive,
    isLoading: false,
    error: null,
    hasMoreSessions: buildHasMore(data.sessions),
    sessionsCursor: buildSessionsCursor(data.sessions),
    analytics: null,
    analyticsKey: null,
    filters: DEFAULT_FILTERS,
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
  canUseLive: boolean;
  isLoading: boolean;
  error: CockpitError | null;
  analytics: TradingAnalytics | null;
  setMode: (mode: CockpitMode) => void;
  setTab: (tab: CockpitTab) => void;
  refresh: () => Promise<void>;
  loadMoreSessions: () => Promise<void>;
  hasMoreSessions: boolean;
}

const TradingCockpitContext = createContext<CockpitContextValue | null>(null);

export function TradingCockpitProvider({
  children,
  initialData,
  userId: _userId,
  locale,
}: TradingCockpitProviderProps) {
  const { mode: urlMode, tab: urlTab, updateUrl } = useCockpitUrlSync();
  const [state, dispatch] = useReducer(
    reducer,
    initialData,
    createInitialState,
  );
  const abortRef = useRef<AbortController | null>(null);

  const fetchInitial = useCallback(
    async (mode: CockpitMode, tab: CockpitTab, signal?: AbortSignal) => {
      dispatch({ type: "FETCH_START" });
      try {
        const params = new URLSearchParams({ mode, tab });
        const res = await fetch(`/api/trading-cockpit/initial?${params.toString()}`, {
          signal,
          credentials: "same-origin",
          headers: { "Accept-Language": locale },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as CockpitInitialData;
        dispatch({ type: "FETCH_SUCCESS", payload: data });
        if (data.mode !== mode || data.tab !== tab) {
          updateUrl({ mode: data.mode, tab: data.tab });
        }
      } catch (err) {
        if (signal?.aborted) return;
        dispatch({
          type: "FETCH_ERROR",
          error: {
            message: err instanceof Error ? err.message : "Unknown error",
            code: "FETCH_INITIAL_FAILED",
          },
        });
      }
    },
    [locale, updateUrl],
  );

  // React to external URL changes (back/forward, direct links).
  useEffect(() => {
    if (urlMode === state.mode && urlTab === state.activeTab) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    void fetchInitial(urlMode, urlTab, controller.signal);

    return () => {
      controller.abort();
    };
  }, [urlMode, urlTab, state.mode, state.activeTab, fetchInitial]);

  // Load analytics when the analysis tab is active and stale.
  useEffect(() => {
    if (state.activeTab !== "analysis") return;

    const key = `${state.mode}:${state.filters.dateRange}`;
    if (state.analytics && state.analyticsKey === key) return;

    const controller = new AbortController();

    async function load() {
      try {
        const params = new URLSearchParams({
          mode: state.mode,
          dateRange: state.filters.dateRange,
        });
        const res = await fetch(`/api/trading-cockpit/analytics?${params.toString()}`, {
          signal: controller.signal,
          credentials: "same-origin",
          headers: { "Accept-Language": locale },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const { analytics } = (await res.json()) as { analytics: TradingAnalytics };
        dispatch({ type: "SET_ANALYTICS", analytics, key });
      } catch (err) {
        if (controller.signal.aborted) return;
        dispatch({
          type: "FETCH_ERROR",
          error: {
            message: err instanceof Error ? err.message : "Unknown error",
            code: "FETCH_ANALYTICS_FAILED",
          },
        });
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [state.activeTab, state.mode, state.filters.dateRange, state.analytics, state.analyticsKey, locale]);

  const setMode = useCallback(
    (mode: CockpitMode) => {
      if (mode === state.mode) return;
      if (mode === "live" && !state.canUseLive) {
        dispatch({
          type: "FETCH_ERROR",
          error: {
            message: "Live trading is not available for your account.",
            code: "LIVE_NOT_ALLOWED",
          },
        });
        return;
      }
      dispatch({ type: "SET_URL", mode, tab: state.activeTab });
      updateUrl({ mode });
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      void fetchInitial(mode, state.activeTab, controller.signal);
    },
    [state.canUseLive, state.mode, state.activeTab, updateUrl, fetchInitial],
  );

  const setTab = useCallback(
    (tab: CockpitTab) => {
      if (tab === state.activeTab) return;
      dispatch({ type: "SET_URL", mode: state.mode, tab });
      updateUrl({ tab });
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      void fetchInitial(state.mode, tab, controller.signal);
    },
    [state.mode, state.activeTab, updateUrl, fetchInitial],
  );

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    await fetchInitial(state.mode, state.activeTab, controller.signal);
  }, [state.mode, state.activeTab, fetchInitial]);

  const loadMoreSessions = useCallback(async () => {
    if (!state.hasMoreSessions || state.isLoading) return;
    dispatch({ type: "LOAD_MORE_START" });
    try {
      const params = new URLSearchParams({
        mode: state.mode,
        limit: String(SESSIONS_LIMIT),
      });
      if (state.sessionsCursor) {
        params.set("cursor", state.sessionsCursor);
      }
      const res = await fetch(`/api/trading-cockpit/sessions?${params.toString()}`, {
        credentials: "same-origin",
        headers: { "Accept-Language": locale },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { sessions, nextCursor, hasMore } = (await res.json()) as {
        sessions: TradingSessionSummary[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      dispatch({ type: "LOAD_MORE_SUCCESS", sessions, nextCursor, hasMore });
    } catch (err) {
      dispatch({
        type: "LOAD_MORE_ERROR",
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          code: "FETCH_SESSIONS_FAILED",
        },
      });
    }
  }, [state.hasMoreSessions, state.isLoading, state.mode, state.sessionsCursor, locale]);

  const value = useMemo<CockpitContextValue>(
    () => ({
      mode: state.mode,
      tab: state.activeTab,
      metrics: state.metrics,
      sessions: state.sessions,
      statusCounts: state.statusCounts,
      canUseLive: state.canUseLive,
      isLoading: state.isLoading,
      error: state.error,
      analytics: state.analytics,
      setMode,
      setTab,
      refresh,
      loadMoreSessions,
      hasMoreSessions: state.hasMoreSessions,
    }),
    [
      state.mode,
      state.activeTab,
      state.metrics,
      state.sessions,
      state.statusCounts,
      state.canUseLive,
      state.isLoading,
      state.error,
      state.analytics,
      state.hasMoreSessions,
      setMode,
      setTab,
      refresh,
      loadMoreSessions,
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
      "useCockpitContext must be used within TradingCockpitProvider",
    );
  }
  return ctx;
}
