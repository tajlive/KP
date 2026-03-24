export type DataSourceState = "live" | "stale" | "demo" | "empty" | "error";

export interface DataSourceThresholds {
  staleMinutes: number;
  criticalMinutes: number;
  incidentMinutes: number;
}

export const DATA_SOURCE_THRESHOLDS: DataSourceThresholds = {
  staleMinutes: 20,
  criticalMinutes: 40,
  incidentMinutes: 60,
};

export interface TradingFeedStateInput {
  hasError: boolean;
  usesFallback: boolean;
  latestSignalAgeMinutes: number | null;
}

/**
 * Canonical state mapping for signal feed rendering.
 * Keep this as the only source for LIVE/STALE/DEMO/EMPTY/ERROR semantics.
 */
export function getTradingFeedState(
  input: TradingFeedStateInput,
  thresholds: DataSourceThresholds = DATA_SOURCE_THRESHOLDS,
): DataSourceState {
  if (input.hasError) return "error";
  if (input.usesFallback) return "demo";
  if (input.latestSignalAgeMinutes == null) return "empty";
  if (input.latestSignalAgeMinutes > thresholds.staleMinutes) return "stale";
  return "live";
}

export type DiscoverStateReason =
  | "ok"
  | "auth_required"
  | "no_public_traders"
  | "backend_error"
  | "unknown";

export interface DiscoverStateInput {
  hasError: boolean;
  unauthorized: boolean;
  leadersCount: number;
}

export function getDiscoverStateReason(
  input: DiscoverStateInput,
): DiscoverStateReason {
  if (input.unauthorized) return "auth_required";
  if (input.hasError) return "backend_error";
  if (input.leadersCount === 0) return "no_public_traders";
  return "ok";
}
