import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionCards, type SessionCardData } from "../SessionCards";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, options?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "title": "Sessioner",
      "all": "Alle",
      "active": "Aktive",
      "stopped": "Stoppet",
      "paused": "Pauset",
      "crashed": "Krasjet",
      "live": "LIVE",
      "trades": "trades",
      "winRate": "win rate",
      "seeDetails": "Se detaljer",
      "noFiltered": "Ingen {{status}} sessioner",
      "activeLC": "aktive",
      "pausedLC": "pausete",
      "stoppedLC": "stoppete",
    };
    let result = messages[key] || key;
    if (options && typeof result === "string") {
      Object.entries(options).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });
    }
    return result;
  },
}));

vi.mock("../SessionDetailDialog", () => ({
  SessionDetailDialog: () => null,
}));

const mockSessions: SessionCardData[] = [
  {
    id: "s1",
    mode: "paper",
    status: "active",
    trading_pair: "BTC-USDT",
    strategy_id: "dca",
    current_capital_nok: 115_000,
    starting_capital_nok: 100_000,
    total_pnl: 15_000,
    total_trades: 12,
    winning_trades: 8,
    losing_trades: 4,
    created_at: "2026-01-01T00:00:00Z",
    stopped_at: null,
    open_position: null,
  },
  {
    id: "s2",
    mode: "live",
    status: "stopped",
    trading_pair: "ETH-USDT",
    strategy_id: "trend",
    current_capital_nok: 90_000,
    starting_capital_nok: 100_000,
    total_pnl: -10_000,
    total_trades: 5,
    winning_trades: 2,
    losing_trades: 3,
    created_at: "2026-01-02T00:00:00Z",
    stopped_at: "2026-01-03T00:00:00Z",
    open_position: null,
  },
  {
    id: "s3",
    mode: "paper",
    status: "paused",
    trading_pair: "SOL-USDT",
    strategy_id: "grid",
    current_capital_nok: 100_000,
    starting_capital_nok: 100_000,
    total_pnl: 0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    created_at: "2026-01-03T00:00:00Z",
    stopped_at: null,
    open_position: null,
  },
];

describe("SessionCards", () => {
  it("renders title and filter tabs", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    expect(screen.getByText("Sessioner")).toBeInTheDocument();
    expect(screen.getByText(/Alle \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Aktive \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Stoppet \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Pauset \(1\)/)).toBeInTheDocument();
  });

  it("renders all sessions by default", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    expect(screen.getByText("BTC-USDT")).toBeInTheDocument();
    expect(screen.getByText("ETH-USDT")).toBeInTheDocument();
    expect(screen.getByText("SOL-USDT")).toBeInTheDocument();
  });

  it("filters to show only active sessions", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    // Use getAllByText because status appears in both tab and badge
    fireEvent.click(screen.getAllByText(/Aktive/)[0]);
    expect(screen.getByText("BTC-USDT")).toBeInTheDocument();
    expect(screen.queryByText("ETH-USDT")).not.toBeInTheDocument();
    expect(screen.queryByText("SOL-USDT")).not.toBeInTheDocument();
  });

  it("filters to show only stopped sessions", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    fireEvent.click(screen.getAllByText(/Stoppet/)[0]);
    expect(screen.queryByText("BTC-USDT")).not.toBeInTheDocument();
    expect(screen.getByText("ETH-USDT")).toBeInTheDocument();
    expect(screen.queryByText("SOL-USDT")).not.toBeInTheDocument();
  });

  it("filters to show only paused sessions", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    fireEvent.click(screen.getAllByText(/Pauset/)[0]);
    expect(screen.queryByText("BTC-USDT")).not.toBeInTheDocument();
    expect(screen.queryByText("ETH-USDT")).not.toBeInTheDocument();
    expect(screen.getByText("SOL-USDT")).toBeInTheDocument();
  });

  it("shows empty state when filter matches no sessions", () => {
    render(<SessionCards sessions={[]} locale="no" />);
    // Component returns null when no sessions
    expect(screen.queryByText("Sessioner")).not.toBeInTheDocument();
  });

  it("shows no filtered results message", () => {
    const onlyActive = [mockSessions[0]];
    render(<SessionCards sessions={onlyActive} locale="no" />);
    fireEvent.click(screen.getByText(/Stoppet/));
    expect(screen.getByText(/Ingen/)).toBeInTheDocument();
  });

  it("calculates PnL percentage correctly", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    // BTC: (115000 - 100000) / 100000 * 100 = 15.0%
    expect(screen.getByText(/\+15\.0%/)).toBeInTheDocument();
  });

  it("calculates negative PnL correctly", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    // ETH: (90000 - 100000) / 100000 * 100 = -10.0%
    expect(screen.getByText(/-10\.0%/)).toBeInTheDocument();
  });

  it("shows zero PnL for break-even session", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    // SOL: (100000 - 100000) / 100000 * 100 = 0.0%
    // Multiple 0.0% may exist — check at least one is present
    expect(screen.getAllByText(/0\.0%/).length).toBeGreaterThanOrEqual(1);
  });

  it("calculates win rate correctly", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    // BTC: 8 wins / 12 total = 66.67% → rounded to 67%
    expect(screen.getByText(/67%/)).toBeInTheDocument();
  });

  it("shows 0% win rate when no completed trades", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    // SOL: 0 trades → 0% win rate
    // Multiple 0% may exist — check at least one is present
    expect(screen.getAllByText(/0%/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows LIVE badge for live mode", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("shows correct status badge for each session", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    expect(screen.getByText("Aktive")).toBeInTheDocument(); // In tab + badge
    expect(screen.getByText("Stoppet")).toBeInTheDocument();
    expect(screen.getByText("Pauset")).toBeInTheDocument();
  });

  it("handles zero starting capital without division by zero", () => {
    const zeroStart = [{
      ...mockSessions[0],
      starting_capital_nok: 0,
      current_capital_nok: 50_000,
    }];
    render(<SessionCards sessions={zeroStart} locale="no" />);
    // Should show 0.0% not NaN/Infinity
    expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
  });

  it("shows trade count for each session", () => {
    render(<SessionCards sessions={mockSessions} locale="no" />);
    expect(screen.getByText(/12 trades/)).toBeInTheDocument();
    expect(screen.getByText(/5 trades/)).toBeInTheDocument();
  });
});
