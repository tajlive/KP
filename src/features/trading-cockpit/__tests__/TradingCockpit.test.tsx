import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TradingCockpit } from "../components/TradingCockpit";
import type { CockpitContextValue } from "../hooks/useCockpit";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "no",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/no/handel",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../hooks/useCockpit", () => ({
  useCockpit: (): CockpitContextValue => ({
    mode: "paper",
    tab: "overview",
    metrics: {
      totalPnl: 1234,
      totalTrades: 10,
      winRate: 0.5,
      totalCapital: 50000,
      startingCapital: 50000,
      winningTrades: 5,
      losingTrades: 5,
      sessionCount: 1,
      recentSessions: [],
    },
    sessions: [],
    statusCounts: { active: 0, paused: 0, stopped: 0, crashed: 0 },
    canUseLive: false,
    autoTradeSettings: { auto_trading_enabled: false, risk_profile: "moderate" },
    riskStatus: { dailyLossLimitReached: false, maxDrawdownReached: false, crashed: false },
    isLoading: false,
    error: null,
    analytics: null,
    filters: {
      dateRange: "30d",
      pair: null,
      sessionStatus: "all",
      side: "all",
      tradeStatus: "all",
      search: "",
    },
    trades: [],
    hasMoreTrades: false,
    isLoadingTrades: false,
    tradesError: null,
    unreadTradeCount: 0,
    hasMoreSessions: false,
    setMode: vi.fn(),
    setTab: vi.fn(),
    refresh: vi.fn(),
    loadMoreSessions: vi.fn(),
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    loadTrades: vi.fn(),
    loadMoreTrades: vi.fn(),
    markTradesAsSeen: vi.fn(),
  }),
}));

describe("TradingCockpit", () => {
  it("renders without crashing in overview tab", () => {
    render(<TradingCockpit />);
    expect(screen.getByTestId("cockpit-header")).toBeInTheDocument();
    expect(screen.getByTestId("cockpit-tab-overview")).toBeInTheDocument();
    expect(screen.getByTestId("cockpit-tab-trades")).toBeInTheDocument();
    expect(screen.getByTestId("cockpit-tab-analysis")).toBeInTheDocument();
  });

  it("shows auto-trading activation CTA when auto-trading is disabled", () => {
    render(<TradingCockpit />);
    expect(screen.getByTestId("auto-trading-activation")).toBeInTheDocument();
    expect(screen.getByTestId("auto-trading-activate-button")).toBeInTheDocument();
  });
});
