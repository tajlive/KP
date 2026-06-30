import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TradingCockpit } from "../components/TradingCockpit";
import type { CockpitContextValue } from "../hooks/useCockpit";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "no",
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
    isLoading: false,
    error: null,
    setMode: vi.fn(),
    setTab: vi.fn(),
    refresh: vi.fn(),
    loadMoreSessions: vi.fn(),
    hasMoreSessions: false,
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
});
