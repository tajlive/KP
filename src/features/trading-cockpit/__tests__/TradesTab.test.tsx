import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradesTab } from "../components/trades/TradesTab";
import type { CockpitContextValue } from "../hooks/useCockpit";
import type { Trade, CockpitFilters } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values && "count" in values) return `${key}(${values.count})`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("../hooks/useCockpit", () => ({
  useCockpit: (): CockpitContextValue => mockCockpitValue,
}));

const DEFAULT_FILTERS: CockpitFilters = {
  dateRange: "30d",
  pair: null,
  sessionStatus: "all",
  side: "all",
  tradeStatus: "all",
  search: "",
};

const mockTrades: Trade[] = [
  {
    id: "trade-1",
    session_id: "session-1",
    trading_pair: "BTCUSDT",
    side: "buy",
    status: "filled",
    price: 100_000,
    quantity: 0.5,
    fee: 10,
    total_value: 50_010,
    realized_pnl: 1_200,
    effective_pnl: 1_150,
    executed_at: "2026-06-29T12:00:00Z",
    created_at: "2026-06-29T11:59:00Z",
  },
  {
    id: "trade-2",
    session_id: "session-1",
    trading_pair: "ETHUSDT",
    side: "sell",
    status: "partially_filled",
    price: 3_000,
    quantity: 2,
    fee: 5,
    total_value: 5_995,
    realized_pnl: -200,
    effective_pnl: -205,
    executed_at: "2026-06-28T10:00:00Z",
    created_at: "2026-06-28T09:59:00Z",
  },
];

let mockCockpitValue: CockpitContextValue;

function createMockValue(overrides: Partial<CockpitContextValue> = {}): CockpitContextValue {
  return {
    mode: "paper",
    tab: "trades",
    metrics: {
      totalPnl: 0,
      totalTrades: 0,
      winRate: 0,
      totalCapital: 100_000,
      startingCapital: 100_000,
      winningTrades: 0,
      losingTrades: 0,
      sessionCount: 0,
      recentSessions: [],
    },
    sessions: [],
    statusCounts: {},
    canUseLive: false,
    isLoading: false,
    error: null,
    analytics: null,
    filters: DEFAULT_FILTERS,
    trades: mockTrades,
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
    ...overrides,
  };
}

describe("TradesTab", () => {
  beforeEach(() => {
    mockCockpitValue = createMockValue();
  });

  it("renders trades title with count", () => {
    render(<TradesTab />);
    expect(screen.getByText("cockpit.trades.titleCount(2)")).toBeInTheDocument();
  });

  it("renders desktop filters", () => {
    render(<TradesTab />);
    expect(screen.getByTestId("trade-filters")).toBeInTheDocument();
    expect(screen.getByTestId("trade-search-input")).toBeInTheDocument();
  });

  it("renders mobile filter trigger", () => {
    render(<TradesTab />);
    expect(screen.getByTestId("trade-filters-sheet-trigger")).toBeInTheDocument();
  });

  it("renders trade rows in desktop table", () => {
    render(<TradesTab />);
    expect(screen.getByTestId("trade-row-trade-1")).toBeInTheDocument();
    expect(screen.getByTestId("trade-row-trade-2")).toBeInTheDocument();
  });

  it("renders trade cards on mobile", () => {
    render(<TradesTab />);
    expect(screen.getByTestId("trade-card-trade-1")).toBeInTheDocument();
    expect(screen.getByTestId("trade-card-trade-2")).toBeInTheDocument();
  });

  it("calls setFilters when search input changes", () => {
    render(<TradesTab />);
    const input = screen.getByTestId("trade-search-input");
    fireEvent.change(input, { target: { value: "BTC" } });
    expect(mockCockpitValue.setFilters).toHaveBeenCalledWith({ search: "BTC" });
  });

  it("calls resetFilters when reset button clicked", () => {
    const { rerender } = render(<TradesTab pairs={["BTCUSDT", "ETHUSDT"]} />);
    // Modify a filter so reset is enabled
    mockCockpitValue.filters = { ...DEFAULT_FILTERS, side: "buy" };
    rerender(<TradesTab pairs={["BTCUSDT", "ETHUSDT"]} />);
    const resetButton = screen.getByTestId("trade-filters-reset");
    fireEvent.click(resetButton);
    expect(mockCockpitValue.resetFilters).toHaveBeenCalled();
  });

  it("opens trade details when a row is clicked", async () => {
    render(<TradesTab />);
    fireEvent.click(screen.getByTestId("trade-row-trade-1"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-details-content")).toBeInTheDocument();
    });
  });

  it("opens trade details when a mobile card is clicked", async () => {
    render(<TradesTab />);
    fireEvent.click(screen.getByTestId("trade-card-trade-1"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-details-content")).toBeInTheDocument();
    });
  });

  it("renders empty state when there are no trades", () => {
    mockCockpitValue = createMockValue({ trades: [] });
    render(<TradesTab />);
    expect(screen.getByTestId("trade-empty-state")).toBeInTheDocument();
    expect(screen.getByText("cockpit.trades.noTradesTitle")).toBeInTheDocument();
  });

  it("renders loading skeletons when loading and no trades", () => {
    mockCockpitValue = createMockValue({ trades: [], isLoadingTrades: true });
    render(<TradesTab />);
    expect(screen.getByTestId("trade-table-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("trade-cards-skeleton")).toBeInTheDocument();
  });

  it("renders error state when tradesError is present and no trades", () => {
    mockCockpitValue = createMockValue({
      trades: [],
      tradesError: { message: "Network error", code: "FETCH_FAILED" },
    });
    render(<TradesTab />);
    expect(screen.getByTestId("trade-error-state")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("calls loadMoreTrades when load more button clicked", () => {
    mockCockpitValue = createMockValue({ hasMoreTrades: true });
    render(<TradesTab />);
    fireEvent.click(screen.getByTestId("trade-load-more"));
    expect(mockCockpitValue.loadMoreTrades).toHaveBeenCalled();
  });

  it("does not render pagination when hasMoreTrades is false", () => {
    mockCockpitValue = createMockValue({ hasMoreTrades: false });
    render(<TradesTab />);
    expect(screen.queryByTestId("trade-pagination")).not.toBeInTheDocument();
  });
});
