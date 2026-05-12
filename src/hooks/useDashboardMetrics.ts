"use client";

import { useState, useEffect, useCallback } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import type {
  DashboardMetricsSuccessResponse,
  DashboardMetricsErrorResponse,
} from "@/types/api";

export type DashboardMode = "paper" | "live";
export type SessionScope = "all" | "active" | "active_and_completed";

interface UseDashboardMetricsReturn {
  data: DashboardMetricsSuccessResponse["data"] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseDashboardMetricsOptions {
  enabled?: boolean;
}

export function useDashboardMetrics(
  mode: DashboardMode = "paper",
  sessionScope: SessionScope = "active",
  options: UseDashboardMetricsOptions = {},
): UseDashboardMetricsReturn {
  const { enabled = true } = options;
  const [data, setData] = useState<DashboardMetricsSuccessResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const url = new URL("/api/dashboard/metrics", window.location.origin);
      url.searchParams.set("mode", mode);
      url.searchParams.set("sessionScope", sessionScope);

      const res = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as
          | DashboardMetricsSuccessResponse
          | DashboardMetricsErrorResponse;
        const message =
          body && "error" in body && body.error?.message
            ? body.error.message
            : `HTTP ${res.status}`;
        throw new Error(message);
      }

      const body = (await res.json()) as DashboardMetricsSuccessResponse;

      if (!body.ok || !body.data) {
        throw new Error("Invalid response from dashboard metrics endpoint");
      }

      setData(body.data);
    } catch (err) {
      console.error("[useDashboardMetrics] Failed to fetch metrics:", err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [mode, sessionScope]);

  useEffect(() => {
    if (enabled) {
      fetchMetrics();
    }
  }, [fetchMetrics, enabled]);

  // ── Real-time sync ─────────────────────────────────────────────────
  // Re-fetch metrics whenever a new trade is inserted for this user.
  // Filter is applied on user_id server-side via RLS, so we listen on
  // all INSERT events on trades and let the API do the filtering.
  useRealtime<Record<string, unknown>>({
    table: "trades",
    event: "INSERT",
    enabled: true,
    onInsert: () => {
      // Debounce slightly to avoid hammering the API if multiple trades
      // arrive in quick succession (e.g. copy-trading fan-out).
      const timer = setTimeout(() => {
        fetchMetrics();
      }, 1500);
      return () => clearTimeout(timer);
    },
  });

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchMetrics,
  };
}
