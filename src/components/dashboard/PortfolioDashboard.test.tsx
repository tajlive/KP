import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PortfolioDashboard from "./PortfolioDashboard";

const dashboardT: Record<string, string> = {
  "marketDesk.title": "Live markedsdesk",
  "marketDesk.subtitle": "Undertekst",
  "marketDesk.myPositions": "Mine posisjoner",
  "marketDesk.recentTrades": "Siste handler",
  "marketDesk.noPositions": "Ingen posisjoner",
  "marketDesk.noTrades": "Ingen handler",
  "marketDesk.seeAll": "Se alle",
  "signalPreview.liveBadge": "Live",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => dashboardT[key] ?? key,
  useLocale: () => "no",
}));

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

vi.mock("@/components/dashboard/SocialProof", () => ({
  SocialProof: () => null,
}));

vi.mock("./StreakBadge", () => ({
  StreakBadge: () => null,
}));

vi.mock("@/components/dashboard/FirstTradeCard", () => ({
  default: () => null,
}));

vi.mock("@/components/dashboard/DashboardSignalPreview", () => ({
  DashboardSignalPreview: () => null,
}));

const mockChannel = {
  on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
};
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => mockChannel,
    removeChannel: () => {},
  }),
  getSupabaseClient: () => ({
    channel: () => mockChannel,
    removeChannel: () => {},
  }),
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

  it("derives win rate from realized_pnl when session has no winning_trades", () => {
    render(
      <PortfolioDashboard
        userId="user-1"
        locale="no"
        paperBalance={100000}
        tier="student"
        trialEndsAt={null}
        activeSession={{
          id: "s1",
          mode: "paper",
          status: "active",
          strategy_id: "x",
          current_capital_nok: 100000,
          starting_capital_nok: 100000,
          total_pnl: 0,
          total_trades: 2,
          created_at: "2026-03-18T10:00:00.000Z",
        }}
        trades={[
          {
            id: "t1",
            trading_pair: "BTC/USDT",
            side: "SELL",
            quantity: 1,
            price: 100,
            total_value: 100,
            status: "filled",
            mode: "paper",
            created_at: "2026-03-18T11:00:00.000Z",
            realized_pnl: 10,
          },
          {
            id: "t2",
            trading_pair: "ETH/USDT",
            side: "SELL",
            quantity: 1,
            price: 100,
            total_value: 100,
            status: "filled",
            mode: "paper",
            created_at: "2026-03-18T12:00:00.000Z",
            realized_pnl: -5,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("dashboard-win-rate-pct")).toHaveTextContent(
      "50%",
    );
  });
});
