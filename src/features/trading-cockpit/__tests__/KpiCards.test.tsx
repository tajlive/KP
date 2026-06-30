import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KpiCards } from "../components/KpiCards";
import type { DashboardMetrics, TradingAnalytics } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockMetrics: DashboardMetrics = {
  totalPnl: 12_345.67,
  totalTrades: 42,
  winRate: 0.55,
  totalCapital: 112_345.67,
  startingCapital: 100_000,
  winningTrades: 23,
  losingTrades: 19,
  sessionCount: 3,
  recentSessions: [],
};

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
  trades_by_day: [],
  trades_by_symbol: [],
};

describe("KpiCards", () => {
  it("renders all KPI labels", () => {
    render(<KpiCards metrics={mockMetrics} analytics={mockAnalytics} />);

    expect(screen.getByText("cockpit.kpi.totalPnl")).toBeInTheDocument();
    expect(screen.getByText("cockpit.kpi.winRate")).toBeInTheDocument();
    expect(screen.getByText("cockpit.kpi.totalTrades")).toBeInTheDocument();
    expect(screen.getByText("cockpit.kpi.totalCapital")).toBeInTheDocument();
    expect(screen.getByText("cockpit.kpi.maxDrawdown")).toBeInTheDocument();
    expect(screen.getByText("cockpit.kpi.bestPair")).toBeInTheDocument();
  });

  it("renders metric values without crashing", () => {
    render(<KpiCards metrics={mockMetrics} analytics={mockAnalytics} />);

    // With mocked useTranslations returning keys, numeric values should be present
    // in the document alongside their labels. Best pair renders the symbol directly.
    expect(screen.getByText("BTCUSDT")).toBeInTheDocument();
  });

  it("falls back to zero/empty state when metrics are null", () => {
    render(<KpiCards metrics={null} analytics={null} />);

    expect(screen.getByText("cockpit.kpi.totalPnl")).toBeInTheDocument();
    expect(screen.getByText("cockpit.kpi.bestPair")).toBeInTheDocument();
  });
});
