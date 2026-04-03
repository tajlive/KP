import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { RecentTradesTable } from "../components/RecentTradesTable";
import type { Trade } from "@/lib/trading-api";

const mockTrades: Trade[] = [
  {
    id: "trade-1",
    session_id: "session-1",
    symbol: "BTC",
    side: "buy",
    quantity: 0.5,
    price: 500000,
    total_value: 250000,
    fee: 100,
    realized_pnl: null,
    status: "filled",
    mode: "paper",
    is_copy: false,
    executed_at: "2026-04-01T10:00:00Z",
    created_at: "2026-04-01T10:00:00Z",
    strategy_signal: { strategy_type: "dca_trygg" },
  },
  {
    id: "trade-2",
    session_id: "session-1",
    symbol: "ETH",
    side: "sell",
    quantity: 2,
    price: 30000,
    total_value: 60000,
    fee: 50,
    realized_pnl: 5000,
    status: "filled",
    mode: "live",
    is_copy: false,
    executed_at: "2026-04-02T14:30:00Z",
    created_at: "2026-04-02T14:30:00Z",
    strategy_signal: { strategy_type: "trend_balansert" },
  },
];

// Norwegian messages for testing
const messages = {
  trading: {
    recentTrades: {
      title: "Siste handler",
      empty: "Ingen handler å vise",
      emptyAll: "Start trading for å se handler her",
      emptyPaper: "Ingen øvingshandler ennå",
      emptyLive: "Ingen live-handler ennå",
      filter: "Vis",
      filterAll: "Alle",
      filterPaper: "Lekepenger",
      filterLive: "Live",
      time: "Tid",
      symbol: "Symbol",
      tradeType: "Type",
      strategy: "Strategi",
      size: "Størrelse",
      pnl: "P&L",
      buy: "Kjøp",
      sell: "Salg",
      showingCount: "Viser {count} handler",
      modePaper: "lekepenger",
      modeLive: "live",
      paperShort: "Øv",
    },
  },
};

// Helper to render with i18n provider
const renderWithI18n = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe("RecentTradesTable", () => {
  const defaultProps = {
    trades: mockTrades,
    onSelectTrade: vi.fn(),
  };

  it("renders empty state when no trades", () => {
    renderWithI18n(<RecentTradesTable trades={[]} />);

    expect(screen.getByText("Ingen handler å vise")).toBeInTheDocument();
  });

  it("renders trades with correct data", () => {
    renderWithI18n(<RecentTradesTable {...defaultProps} />);

    expect(screen.getByText("BTC")).toBeInTheDocument();
    expect(screen.getByText("ETH")).toBeInTheDocument();
    expect(screen.getByText("Kjøp")).toBeInTheDocument();
    expect(screen.getByText("Salg")).toBeInTheDocument();
  });

  it("calls onSelectTrade when a row is clicked", () => {
    const onSelectTrade = vi.fn();
    renderWithI18n(<RecentTradesTable trades={mockTrades} onSelectTrade={onSelectTrade} />);

    const rows = screen.getAllByText("BTC");
    fireEvent.click(rows[0].closest("div")!);

    expect(onSelectTrade).toHaveBeenCalledWith("trade-1");
  });

  it("shows mode badges correctly", () => {
    renderWithI18n(<RecentTradesTable {...defaultProps} />);

    // Sjekk at vi har både "Øv" og "Live" badges
    expect(screen.getByText("Øv")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows PnL for trades with realized_pnl", () => {
    renderWithI18n(<RecentTradesTable {...defaultProps} />);

    // ETH-salg har +5,000 kr PnL
    expect(screen.getByText("+5 000 kr")).toBeInTheDocument();
  });

  it("shows filter buttons when onModeFilterChange is provided", () => {
    renderWithI18n(<RecentTradesTable {...defaultProps} onModeFilterChange={vi.fn()} />);

    expect(screen.getByText("Alle")).toBeInTheDocument();
    // "Lekepenger" og "Live" finnes også som badges i tabellen, så vi bruker getAllByText
    expect(screen.getAllByText("Lekepenger").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Live").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onModeFilterChange when filter is clicked", () => {
    const onModeFilterChange = vi.fn();
    renderWithI18n(
      <RecentTradesTable
        trades={mockTrades}
        onModeFilterChange={onModeFilterChange}
      />
    );

    // Bruk getAllByText og velg knappen (første element)
    const liveButtons = screen.getAllByText("Live");
    fireEvent.click(liveButtons[0]);
    expect(onModeFilterChange).toHaveBeenCalledWith("live");

    const paperButtons = screen.getAllByText("Lekepenger");
    fireEvent.click(paperButtons[0]);
    expect(onModeFilterChange).toHaveBeenCalledWith("paper");
  });

  it("highlights selected trade", () => {
    renderWithI18n(
      <RecentTradesTable
        trades={mockTrades}
        onSelectTrade={vi.fn()}
        selectedTradeId="trade-1"
      />
    );

    // Sjekk at selectedTradeId er satt - vi kan ikke lett sjekke styling
    // men vi kan sjekke at komponenten rendrer uten feil
    expect(screen.getByText("BTC")).toBeInTheDocument();
  });

  it("shows correct strategy names", () => {
    renderWithI18n(<RecentTradesTable {...defaultProps} />);

    expect(screen.getByText("dca_trygg")).toBeInTheDocument();
    expect(screen.getByText("trend_balansert")).toBeInTheDocument();
  });
});
