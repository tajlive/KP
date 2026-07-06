import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionList } from "../components/SessionList";
import type { TradingSessionSummary } from "../types";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "no",
}));

const baseSession: TradingSessionSummary = {
  id: "session-1",
  status: "active",
  mode: "paper",
  trading_pair: "BTC/USDT",
  starting_capital_nok: 10000,
  current_capital_nok: 10500,
  total_pnl: 500,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

function renderSessionList(sessions: TradingSessionSummary[] = [baseSession]) {
  return render(<SessionList sessions={sessions} />);
}

describe("SessionList", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders empty state when no sessions", () => {
    renderSessionList([]);
    expect(screen.getByText("cockpit.empty.sessionsTitle")).toBeInTheDocument();
  });

  it("renders session cards on mobile", () => {
    renderSessionList();
    expect(screen.getByTestId("session-cards")).toBeInTheDocument();
    expect(screen.getByTestId("session-card-session-1")).toBeInTheDocument();
  });

  it("navigates to handelshistorikk when a mobile session card is clicked", () => {
    renderSessionList();
    fireEvent.click(screen.getByTestId("session-card-session-1"));
    expect(mockPush).toHaveBeenCalledWith("/no/handelshistorikk");
  });

  it("does not call window.alert", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderSessionList();
    fireEvent.click(screen.getByTestId("session-card-session-1"));
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
