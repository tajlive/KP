"use client";

import { useCallback, useReducer, useRef } from "react";
import type { Trade, CockpitFilters, CockpitError } from "@/features/trading-cockpit/types";
import { DEFAULT_FILTERS } from "@/features/trading-cockpit/constants";
import { useCockpitTradesQuery } from "@/features/trading-cockpit/hooks/useCockpitQueries";

const TRADES_LIMIT = 25;

// ── Trade-specific state ──

interface TradeState {
  trades: Trade[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: CockpitError | null;
  unreadCount: number;
  filters: CockpitFilters;
}

type TradeAction =
  | { type: "SET_FILTERS"; filters: Partial<CockpitFilters> }
  | { type: "RESET_FILTERS" }
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; trades: Trade[]; nextCursor: string | null; hasMore: boolean }
  | { type: "LOAD_ERROR"; error: CockpitError }
  | { type: "LOAD_MORE_START" }
  | { type: "LOAD_MORE_SUCCESS"; trades: Trade[]; nextCursor: string | null; hasMore: boolean }
  | { type: "LOAD_MORE_ERROR"; error: CockpitError }
  | { type: "INCREMENT_UNREAD" }
  | { type: "MARK_SEEN" };

function tradeReducer(state: TradeState, action: TradeAction): TradeState {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.filters }, cursor: null, hasMore: false };
    case "RESET_FILTERS":
      return { ...state, filters: DEFAULT_FILTERS, cursor: null, hasMore: false };
    case "LOAD_START":
      return { ...state, isLoading: true, error: null, trades: [] };
    case "LOAD_SUCCESS":
      return { ...state, trades: action.trades, cursor: action.nextCursor, hasMore: action.hasMore, isLoading: false, error: null };
    case "LOAD_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "LOAD_MORE_START":
      return { ...state, isLoading: true, error: null };
    case "LOAD_MORE_SUCCESS":
      return { ...state, trades: [...state.trades, ...action.trades], cursor: action.nextCursor, hasMore: action.hasMore, isLoading: false, error: null };
    case "LOAD_MORE_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "INCREMENT_UNREAD":
      return { ...state, unreadCount: state.unreadCount + 1 };
    case "MARK_SEEN":
      return { ...state, unreadCount: 0 };
    default:
      return state;
  }
}

const initialTradeState: TradeState = {
  trades: [],
  cursor: null,
  hasMore: false,
  isLoading: false,
  error: null,
  unreadCount: 0,
  filters: DEFAULT_FILTERS,
};

export function useCockpitTradeState() {
  const [state, dispatch] = useReducer(tradeReducer, initialTradeState);
  const filtersRef = useRef(state.filters);
  filtersRef.current = state.filters;

  const { data: queryData, isLoading: queryLoading } = useCockpitTradesQuery({
    mode: "paper", // will be overridden by Provider
    cursor: state.cursor,
    limit: TRADES_LIMIT,
    dateRange: state.filters.dateRange,
    pair: state.filters.pair,
    sessionStatus: state.filters.sessionStatus,
    side: state.filters.side,
    tradeStatus: state.filters.tradeStatus,
    search: state.filters.search,
  });

  const setFilters = useCallback((filters: Partial<CockpitFilters>) => {
    dispatch({ type: "SET_FILTERS", filters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: "RESET_FILTERS" });
  }, []);

  const markSeen = useCallback(() => {
    dispatch({ type: "MARK_SEEN" });
  }, []);

  const incrementUnread = useCallback(() => {
    dispatch({ type: "INCREMENT_UNREAD" });
  }, []);

  return {
    trades: queryData?.trades ?? state.trades,
    hasMoreTrades: Boolean(queryData?.next_cursor) || state.hasMore,
    isLoadingTrades: state.isLoading || queryLoading,
    tradesError: state.error,
    unreadTradeCount: state.unreadCount,
    filters: state.filters,
    setFilters,
    resetFilters,
    markSeen,
    incrementUnread,
    dispatch,
  };
}
