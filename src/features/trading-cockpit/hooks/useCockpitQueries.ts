"use client";

import { useQuery } from "@tanstack/react-query";
import type { Trade, TradingAnalytics } from "@/features/trading-cockpit/types";

interface TradesParams {
  mode: "paper" | "live";
  cursor: string | null;
  limit: number;
  dateRange?: string;
  pair?: string | null;
  sessionStatus?: string;
  side?: string;
  tradeStatus?: string;
  search?: string;
}

async function fetchTrades(params: TradesParams): Promise<{ trades: Trade[]; next_cursor: string | null }> {
  const searchParams = new URLSearchParams();
  searchParams.set("mode", params.mode);
  searchParams.set("limit", String(params.limit));
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.dateRange && params.dateRange !== "all") searchParams.set("dateRange", params.dateRange);
  if (params.pair) searchParams.set("pair", params.pair);
  if (params.sessionStatus && params.sessionStatus !== "all") searchParams.set("sessionStatus", params.sessionStatus);
  if (params.side && params.side !== "all") searchParams.set("side", params.side);
  if (params.tradeStatus && params.tradeStatus !== "all") searchParams.set("status", params.tradeStatus);
  if (params.search) searchParams.set("search", params.search);

  const res = await fetch(`/api/trading-cockpit/trades?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export function useCockpitTradesQuery(params: TradesParams) {
  return useQuery({
    queryKey: ["cockpit-trades", params],
    queryFn: () => fetchTrades(params),
    staleTime: 15_000,    // trades are time-sensitive — 15s stale
    enabled: Boolean(params.mode),
    placeholderData: (prev) => prev, // keep previous data while loading more
  });
}

// ── Analytics query ──

interface AnalyticsParams {
  mode: "paper" | "live";
  dateRange: string;
  pair?: string;
  status?: string;
  sessionStatus?: string;
  side?: string;
  search?: string;
}

async function fetchAnalytics(params: AnalyticsParams): Promise<TradingAnalytics> {
  const searchParams = new URLSearchParams();
  searchParams.set("mode", params.mode);
  searchParams.set("dateRange", params.dateRange);
  if (params.pair) searchParams.set("pair", params.pair);
  if (params.status) searchParams.set("status", params.status);
  if (params.sessionStatus) searchParams.set("sessionStatus", params.sessionStatus);
  if (params.side) searchParams.set("side", params.side);
  if (params.search) searchParams.set("search", params.search);

  const res = await fetch(`/api/trading-cockpit/analytics?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return data.analytics;
}

export function useCockpitAnalyticsQuery(params: AnalyticsParams) {
  return useQuery({
    queryKey: ["cockpit-analytics", params],
    queryFn: () => fetchAnalytics(params),
    staleTime: 60_000,    // analytics change slowly — 60s stale
    enabled: Boolean(params.mode),
    placeholderData: (prev) => prev,
  });
}
