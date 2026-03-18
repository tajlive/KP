import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PortfolioDashboard from "./PortfolioDashboard";

vi.mock("@/lib/hooks/useRealtimePrices", () => ({
  useRealtimePrices: () => ({
    coins: [
      {
        symbol: "BTCUSDT",
        name: "Bitcoin",
        price: 1200000,
        change24h: 1.2,
        lastUpdated: new Date(),
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock("./ReverseTrial", () => ({
  default: () => null,
}));

vi.mock("./SocialProof", () => ({
  SocialProof: () => null,
}));

vi.mock("./StreakBadge", () => ({
  StreakBadge: () => null,
}));

vi.mock("./FirstTradeCard", () => ({
  default: () => null,
}));

describe("PortfolioDashboard", () => {
  it("renders a position from dashboard trade rows", () => {
    render(
      <PortfolioDashboard
        userId="user-1"
        locale="no"
        paperBalance={100000}
        tier="student"
        trialEndsAt={null}
        activeSession={null}
        trades={[
          {
            id: "trade-1",
            trading_pair: "BTC/USDT",
            side: "BUY",
            quantity: 1,
            price: 1000000,
            total_value: 1000000,
            status: "filled",
            mode: "paper",
            created_at: "2026-03-18T10:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("Mine posisjoner")).toBeInTheDocument();
    expect(screen.getByText("1.0000 BTC")).toBeInTheDocument();
    expect(
      screen.queryByText("Ingen posisjoner ennå. Kjøp din første coin!"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Kjøpte BTC/)).toBeInTheDocument();
  });
});
