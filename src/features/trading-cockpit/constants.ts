import type { CockpitFilters, CockpitPagination, CockpitTab } from "./types";

export const DEFAULT_FILTERS: CockpitFilters = {
  dateRange: "30d",
  pair: null,
  sessionStatus: "all",
  side: "all",
  tradeStatus: "all",
  search: "",
};

export const DEFAULT_PAGINATION: CockpitPagination = {
  tradesLimit: 25,
  tradesCursor: null,
  hasMoreTrades: false,
};

export const TAB_URL_MAP: Record<CockpitTab, string> = {
  overview: "overview",
  trades: "trades",
  analysis: "analysis",
  sessions: "sessions",
};

export const COCKPIT_MODES = ["paper", "live"] as const;

export const COCKPIT_TABS = ["overview", "trades", "analysis"] as const;
