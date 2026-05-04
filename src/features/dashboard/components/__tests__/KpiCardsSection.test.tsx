import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCardsSection } from "../KpiCardsSection";
import type { AnalyticsPayload } from "../../TradingResultsDashboard";

const mockData: AnalyticsPayload = {
  ok: true,
  generatedAt: "2026-01-01",
  tradeCount: 42,
  aggregates: {
    rowCount: 42,
    winCount: 25,
    lossCount: 15,
    breakevenCount: 2,
    noRealizedPnlCount: 0,
    totalRealizedPnl: 1000,
    totalEffectivePnl: 1200,
    winRateRealizedPct: 59.5,
  },
  winLossSlices: [],
  daily: [],
  pairs: [],
  modeSplits: [],
  bestDay: { day: "2026-01-15", pnl: 500 },
};

const mockT = vi.fn((key: string) => {
  const map: Record<string, string> = {
    "kpi.totalPnl": "Total PnL",
    "kpi.winRate": "Win Rate",
    "kpi.trades": "Trades",
    "kpi.bestDay": "Best Day",
    "kpi.totalPnlHint": "Hint text",
  };
  return map[key] || key;
});

describe("KpiCardsSection", () => {
  it("renders all 4 KPI cards", () => {
    render(
      <KpiCardsSection
        data={mockData}
        totalPnl={1200}
        pnlPositive={true}
        formatDisplay={(v) => `${v} NOK`}
        t={mockT}
      />,
    );

    expect(screen.getByText("Total PnL")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Trades")).toBeInTheDocument();
    expect(screen.getByText("Best Day")).toBeInTheDocument();
  });

  it("shows correct values", () => {
    render(
      <KpiCardsSection
        data={mockData}
        totalPnl={1200}
        pnlPositive={true}
        formatDisplay={(v) => `${v} NOK`}
        t={mockT}
      />,
    );

    expect(screen.getByText("1200 NOK")).toBeInTheDocument();
    expect(screen.getByText("59.5%")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("2026-01-15 · 500 NOK")).toBeInTheDocument();
  });

  it("shows hint when realized pnl is zero but trades exist", () => {
    const zeroPnlData = { ...mockData, aggregates: { ...mockData.aggregates, totalRealizedPnl: 0, noRealizedPnlCount: 5 } };
    render(
      <KpiCardsSection
        data={zeroPnlData}
        totalPnl={0}
        pnlPositive={false}
        formatDisplay={(v) => `${v} NOK`}
        t={mockT}
      />,
    );

    expect(screen.getByText("Hint text")).toBeInTheDocument();
  });
});
