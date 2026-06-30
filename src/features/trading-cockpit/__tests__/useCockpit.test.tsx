import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCockpit, CockpitProvider } from "../hooks/useCockpit";
import type { CockpitInitialData } from "../types";
import { toast } from "sonner";

let mockUrlTab = "overview";
let mockUrlMode = "paper";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/no/handel",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("../hooks/useCockpitUrlSync", () => ({
  useCockpitUrlSync: () => ({
    mode: mockUrlMode,
    tab: mockUrlTab,
    hasModeParam: false,
    hasTabParam: mockUrlTab !== "overview",
    updateUrl: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        subscription: { unsubscribe: vi.fn() },
      }),
    },
    realtime: {
      setAuth: vi.fn().mockResolvedValue(undefined),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue("ok"),
  }),
}));

const mockMetrics = {
  totalPnl: 0,
  totalTrades: 0,
  winRate: 0,
  totalCapital: 100_000,
  startingCapital: 100_000,
  winningTrades: 0,
  losingTrades: 0,
  sessionCount: 0,
  recentSessions: [],
};

const baseInitialData: CockpitInitialData = {
  mode: "paper",
  defaultMode: "paper",
  tab: "overview",
  metrics: mockMetrics,
  sessions: [],
  statusCounts: {},
  canUseLive: false,
  autoTradeSettings: { auto_trading_enabled: false, risk_profile: "moderate" },
};

function TestConsumer() {
  const cockpit = useCockpit();
  return (
    <div>
      <span data-testid="mode">{cockpit.mode}</span>
      <span data-testid="tab">{cockpit.tab}</span>
      <span data-testid="canUseLive">{cockpit.canUseLive ? "yes" : "no"}</span>
      <span data-testid="isLoading">{cockpit.isLoading ? "yes" : "no"}</span>
      <span data-testid="filters">{JSON.stringify(cockpit.filters)}</span>
      <span data-testid="tradesCount">{cockpit.trades.length}</span>
      <span data-testid="isLoadingTrades">
        {cockpit.isLoadingTrades ? "yes" : "no"}
      </span>
      <span data-testid="unreadTradeCount">{cockpit.unreadTradeCount}</span>
      <button data-testid="markTradesAsSeen" onClick={cockpit.markTradesAsSeen}>
        Mark Seen
      </button>
      <button data-testid="refresh" onClick={cockpit.refresh}>
        Refresh
      </button>
      <button
        data-testid="setFilter"
        onClick={() => cockpit.setFilters({ side: "buy" })}
      >
        Set Filter
      </button>
      <button data-testid="resetFilters" onClick={cockpit.resetFilters}>
        Reset Filters
      </button>
      <button data-testid="loadMoreTrades" onClick={cockpit.loadMoreTrades}>
        Load More Trades
      </button>
    </div>
  );
}

describe("useCockpit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUrlTab = "overview";
    mockUrlMode = "paper";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseInitialData),
    } as Response);
  });

  it("returns the provided initial context value", () => {
    render(
      <CockpitProvider
        initialData={baseInitialData}
        userId="user-1"
        locale="no"
      >
        <TestConsumer />
      </CockpitProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("paper");
    expect(screen.getByTestId("tab")).toHaveTextContent("overview");
    expect(screen.getByTestId("canUseLive")).toHaveTextContent("no");
    expect(screen.getByTestId("isLoading")).toHaveTextContent("no");
  });

  it("throws when used outside a CockpitProvider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow();

    consoleError.mockRestore();
  });

  it("updates state after refresh fetches new data", async () => {
    const refreshedData: CockpitInitialData = {
      ...baseInitialData,
      mode: "live",
      tab: "analysis",
      canUseLive: true,
      metrics: {
        ...mockMetrics,
        totalCapital: 75_000,
      },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(refreshedData),
    } as Response);

    render(
      <CockpitProvider
        initialData={baseInitialData}
        userId="user-1"
        locale="no"
      >
        <TestConsumer />
      </CockpitProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("paper");
    expect(screen.getByTestId("tab")).toHaveTextContent("overview");

    fireEvent.click(screen.getByTestId("refresh"));

    await waitFor(() => {
      expect(screen.getByTestId("isLoading")).toHaveTextContent("yes");
    });

    await waitFor(() => {
      expect(screen.getByTestId("mode")).toHaveTextContent("live");
      expect(screen.getByTestId("tab")).toHaveTextContent("analysis");
      expect(screen.getByTestId("canUseLive")).toHaveTextContent("yes");
      expect(screen.getByTestId("isLoading")).toHaveTextContent("no");
    });
  });

  it("exposes default filters and updates them via setFilters", () => {
    render(
      <CockpitProvider
        initialData={baseInitialData}
        userId="user-1"
        locale="no"
      >
        <TestConsumer />
      </CockpitProvider>,
    );

    expect(screen.getByTestId("filters")).toHaveTextContent(
      '"dateRange":"30d"',
    );

    fireEvent.click(screen.getByTestId("setFilter"));

    expect(screen.getByTestId("filters")).toHaveTextContent('"side":"buy"');
  });

  it("resets filters to defaults", () => {
    render(
      <CockpitProvider
        initialData={baseInitialData}
        userId="user-1"
        locale="no"
      >
        <TestConsumer />
      </CockpitProvider>,
    );

    fireEvent.click(screen.getByTestId("setFilter"));
    expect(screen.getByTestId("filters")).toHaveTextContent('"side":"buy"');

    fireEvent.click(screen.getByTestId("resetFilters"));
    expect(screen.getByTestId("filters")).toHaveTextContent(
      '"dateRange":"30d","pair":null,"sessionStatus":"all","side":"all","tradeStatus":"all","search":""',
    );
  });

  it("exposes unread trade count and mark-as-seen action", () => {
    render(
      <CockpitProvider
        initialData={baseInitialData}
        userId="user-1"
        locale="no"
      >
        <TestConsumer />
      </CockpitProvider>,
    );

    expect(screen.getByTestId("unreadTradeCount")).toHaveTextContent("0");
    expect(screen.getByTestId("markTradesAsSeen")).toBeEnabled();
  });
  it("loads trades when url tab is trades", async () => {
    mockUrlTab = "trades";

    const tradesResponse = {
      trades: [
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
      ],
      next_cursor: null,
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tradesResponse),
    } as Response);

    render(
      <CockpitProvider
        initialData={{ ...baseInitialData, tab: "trades" }}
        userId="user-1"
        locale="no"
      >
        <TestConsumer />
      </CockpitProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("isLoadingTrades")).toHaveTextContent("yes");
    });

    await waitFor(() => {
      expect(screen.getByTestId("tradesCount")).toHaveTextContent("1");
      expect(screen.getByTestId("isLoadingTrades")).toHaveTextContent("no");
    });
  });
});
