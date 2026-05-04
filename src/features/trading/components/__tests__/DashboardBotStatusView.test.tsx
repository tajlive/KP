import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Portfolio, Trade, UserStrategy } from "@/lib/trading-api";

// Mock supabase client before importing anything that uses it
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
    }),
  }),
  createClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
    }),
  }),
}));

vi.mock("@/hooks/useI18nToast", () => ({
  useI18nToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../../BotStatusDashboard", () => ({
  default: (props: {
    activeStrategies: UserStrategy[];
    userId: string;
  }) => (
    <div data-testid="bot-status-dashboard">
      <span data-testid="bot-strategies-count">{props.activeStrategies.length}</span>
      <span data-testid="bot-user-id">{props.userId}</span>
    </div>
  ),
}));

// Import after mocks
const { DashboardBotStatusView } = await import("../DashboardBotStatusView");

const mockPortfolio: Portfolio = {
  totalValue: 10000,
  cash: 5000,
  totalPnl: 100,
  winRate: 55,
  positions: [],
};

const mockStrategies: UserStrategy[] = [
  { strategy_id: "1", type: "dca_trygg", status: "active", config: {} },
];

const mockTrades: Trade[] = [];

describe("DashboardBotStatusView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders BotStatusDashboard with correct props", () => {
    render(
      <DashboardBotStatusView
        portfolio={mockPortfolio}
        activeStrategies={mockStrategies}
        recentTrades={mockTrades}
        formatNOK={(v) => `${v} NOK`}
        userId="user-123"
        mode="paper"
        onLoadData={vi.fn()}
        onSetExpandedStrategy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("bot-status-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("bot-strategies-count")).toHaveTextContent("1");
    expect(screen.getByTestId("bot-user-id")).toHaveTextContent("user-123");
  });
});
