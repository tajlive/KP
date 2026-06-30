import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

Element.prototype.scrollIntoView = vi.fn();
import { AnalysisTab } from "../components/analysis/AnalysisTab";
import { AnalyticsStatGrid } from "../components/analysis/AnalyticsStatGrid";
import { PeriodSelector } from "../components/analysis/PeriodSelector";
import type { CockpitContextValue } from "../hooks/useCockpit";
import type { TradingAnalytics } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "no",
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  ),
  Area: () => <div data-testid="recharts-area" />,
  Bar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar">{children}</div>
  ),
  XAxis: () => <div data-testid="recharts-x-axis" />,
  YAxis: () => <div data-testid="recharts-y-axis" />,
  CartesianGrid: () => <div data-testid="recharts-cartesian-grid" />,
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  Cell: () => <div data-testid="recharts-cell" />,
}));

vi.mock("@/shared/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({
    value,
    prefix = "",
    suffix = "",
    decimals = 0,
  }: {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  }) => (
    <span data-testid="animated-number">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  ),
}));

const mockAnalytics: TradingAnalytics = {
  total_trades: 42,
  winning_trades: 23,
  losing_trades: 19,
  win_rate: 0.55,
  total_pnl: 12_345.67,
  total_fees: 123.45,
  starting_capital: 100_000,
  max_drawdown_pct: -0.08,
  profit_factor: 1.4,
  best_pair: "BTCUSDT",
  best_pair_pnl: 5_000,
  worst_pair: "ETHUSDT",
  worst_pair_pnl: -1_200,
  best_session_id: "sess-1",
  best_session_pnl: 7_000,
  worst_session_id: "sess-2",
  worst_session_pnl: -2_000,
  trades_by_day: [
    { date: "2026-06-25", pnl: 1_200, trades: 3 },
    { date: "2026-06-26", pnl: -400, trades: 1 },
    { date: "2026-06-27", pnl: 2_100, trades: 4 },
  ],
  trades_by_symbol: [
    { symbol: "BTCUSDT", pnl: 5_000, trades: 10 },
    { symbol: "ETHUSDT", pnl: -1_200, trades: 5 },
  ],
};

const mockUseCockpit = vi.fn();
vi.mock("../hooks/useCockpit", () => ({
  useCockpit: () => mockUseCockpit(),
}));

describe("PeriodSelector", () => {
  it("renders all period options and calls onChange", () => {
    const onChange = vi.fn();
    render(<PeriodSelector value="30d" onChange={onChange} />);

    expect(screen.getByTestId("analysis-period-selector")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("analysis-period-selector"));

    expect(
      screen.getByTestId("analysis-period-option-7d"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("analysis-period-option-30d"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("analysis-period-option-90d"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("analysis-period-option-1y"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("analysis-period-option-all"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("analysis-period-option-7d"));
    expect(onChange).toHaveBeenCalledWith("7d");
  });
});

describe("AnalyticsStatGrid", () => {
  it("renders all stat labels from analytics", () => {
    render(<AnalyticsStatGrid analytics={mockAnalytics} />);

    expect(
      screen.getByTestId("analytics-stat-grid"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.totalTrades"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.winRate"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.totalPnl"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.totalFees"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.profitFactor"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.maxDrawdown"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.bestPair"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.worstPair"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.bestSession"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.worstSession"),
    ).toBeInTheDocument();
  });

  it("renders best/worst pair and session identifiers", () => {
    render(<AnalyticsStatGrid analytics={mockAnalytics} />);

    expect(screen.getByText("BTCUSDT")).toBeInTheDocument();
    expect(screen.getByText("ETHUSDT")).toBeInTheDocument();
    expect(screen.getByText("sess-1")).toBeInTheDocument();
    expect(screen.getByText("sess-2")).toBeInTheDocument();
  });

  it("renders fallback when analytics is null", () => {
    render(<AnalyticsStatGrid analytics={null} />);

    expect(
      screen.getByTestId("analytics-stat-grid"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.stats.totalTrades"),
    ).toBeInTheDocument();
  });
});

describe("AnalysisTab", () => {
  beforeEach(() => {
    mockUseCockpit.mockReset();
  });

  const baseContext: CockpitContextValue = {
    mode: "paper",
    tab: "analysis",
    metrics: {
      totalPnl: 12_345.67,
      totalTrades: 42,
      winRate: 0.55,
      totalCapital: 112_345.67,
      startingCapital: 100_000,
      winningTrades: 23,
      losingTrades: 19,
      sessionCount: 1,
      recentSessions: [],
    },
    sessions: [],
    statusCounts: {},
    canUseLive: false,
    isLoading: false,
    error: null,
    analytics: mockAnalytics,
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
    hasMoreSessions: false,
    setMode: vi.fn(),
    setTab: vi.fn(),
    refresh: vi.fn(),
    loadMoreSessions: vi.fn(),
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    loadTrades: vi.fn(),
    loadMoreTrades: vi.fn(),
  };

  it("renders analytics content when data is available", () => {
    mockUseCockpit.mockReturnValue(baseContext);
    render(<AnalysisTab />);

    expect(screen.getByText("cockpit.analysis.title")).toBeInTheDocument();
    expect(
      screen.getByTestId("analytics-stat-grid"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("recharts-area-chart")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-bar-chart")).toBeInTheDocument();
  });

  it("renders empty state when analytics is null and not loading", () => {
    mockUseCockpit.mockReturnValue({
      ...baseContext,
      analytics: null,
    });
    render(<AnalysisTab />);

    expect(
      screen.getByText("cockpit.analysis.empty.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.analysis.empty.description"),
    ).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    mockUseCockpit.mockReturnValue({
      ...baseContext,
      analytics: null,
      isLoadingTrades: true,
    });
    render(<AnalysisTab />);

    expect(
      screen.queryByTestId("analytics-stat-grid"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("cockpit.analysis.empty.title"),
    ).not.toBeInTheDocument();
  });

  it("calls setFilters when period changes", () => {
    const setFilters = vi.fn();
    mockUseCockpit.mockReturnValue({
      ...baseContext,
      setFilters,
    });
    render(<AnalysisTab />);

    fireEvent.click(screen.getByTestId("analysis-period-selector"));
    fireEvent.click(screen.getByTestId("analysis-period-option-90d"));

    expect(setFilters).toHaveBeenCalledWith({ dateRange: "90d" });
  });
});
