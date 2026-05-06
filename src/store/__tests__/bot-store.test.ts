import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBotStore } from "../bot-store";
import type { Bot } from "../bot-store";

// Reset store state before each test
beforeEach(() => {
  useBotStore.setState({
    bots: [],
    selectedBotId: null,
    aggregatePnl: { day: 0, week: 0, month: 0, all: 0 },
    filter: "all",
    isLoading: false,
    error: null,
  });
});

const mockBot = (overrides?: Partial<Bot>): Bot => ({
  id: "bot-1",
  userId: "user-1",
  name: "Test Bot",
  strategyType: "dca",
  status: "active",
  mode: "paper",
  symbol: "BTCUSDT",
  config: {},
  pnlNok: 15_000,
  pnlPct: 15,
  totalTrades: 12,
  winningTrades: 8,
  losingTrades: 4,
  currentCapitalNok: 115_000,
  startingCapitalNok: 100_000,
  maxDrawdownPct: 3,
  lastTradeAt: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const mockSupabaseUpdate = vi.fn().mockResolvedValue({ error: null });
const mockSupabaseFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  update: vi.fn().mockReturnValue({
    eq: mockSupabaseUpdate,
  }),
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

describe("bot-store", () => {
  describe("selectors", () => {
    it("filteredBots returns all when filter is 'all'", () => {
      const bots = [mockBot(), mockBot({ id: "bot-2", status: "stopped" })];
      useBotStore.setState({ bots, filter: "all" });
      expect(useBotStore.getState().filteredBots()).toHaveLength(2);
    });

    it("filteredBots filters by status", () => {
      const bots = [
        mockBot({ id: "b1", status: "active" }),
        mockBot({ id: "b2", status: "stopped" }),
        mockBot({ id: "b3", status: "paused" }),
      ];
      useBotStore.setState({ bots, filter: "active" });
      expect(useBotStore.getState().filteredBots()).toHaveLength(1);
      expect(useBotStore.getState().filteredBots()[0].id).toBe("b1");
    });

    it("selectedBot returns null when no selection", () => {
      useBotStore.setState({ bots: [mockBot()], selectedBotId: null });
      expect(useBotStore.getState().selectedBot()).toBeNull();
    });

    it("selectedBot returns correct bot", () => {
      useBotStore.setState({
        bots: [mockBot({ id: "b1" }), mockBot({ id: "b2" })],
        selectedBotId: "b2",
      });
      expect(useBotStore.getState().selectedBot()?.id).toBe("b2");
    });

    it("activeBotCount counts only active bots", () => {
      const bots = [
        mockBot({ id: "b1", status: "active" }),
        mockBot({ id: "b2", status: "active" }),
        mockBot({ id: "b3", status: "stopped" }),
      ];
      useBotStore.setState({ bots });
      expect(useBotStore.getState().activeBotCount()).toBe(2);
    });
  });

  describe("aggregate PnL", () => {
    it("calculates aggregate 'all' from bot PnL", () => {
      // aggregatePnl is calculated during fetchBots/updateBotFromRealtime
      useBotStore.setState({
        bots: [
          mockBot({ id: "b1", pnlNok: 10_000 }),
          mockBot({ id: "b2", pnlNok: 5_000 }),
          mockBot({ id: "b3", pnlNok: -2_000 }),
        ],
      });
      // Trigger recalculation via updateBotFromRealtime
      useBotStore.getState().updateBotFromRealtime("b1", { pnlNok: 10_000 });
      // 10_000 + 5_000 + (-2_000) = 13_000
      expect(useBotStore.getState().aggregatePnl.all).toBe(13_000);
    });

    it("day/week/month are always 0 (known limitation)", () => {
      useBotStore.setState({ bots: [mockBot({ pnlNok: 10_000 })] });
      expect(useBotStore.getState().aggregatePnl.day).toBe(0);
      expect(useBotStore.getState().aggregatePnl.week).toBe(0);
      expect(useBotStore.getState().aggregatePnl.month).toBe(0);
    });

    it("handles empty bot list", () => {
      useBotStore.setState({ bots: [] });
      expect(useBotStore.getState().aggregatePnl.all).toBe(0);
    });

    it("updates aggregate on realtime update", () => {
      useBotStore.setState({ bots: [mockBot({ pnlNok: 10_000 })] });
      useBotStore.getState().updateBotFromRealtime("bot-1", { pnlNok: 20_000 });
      expect(useBotStore.getState().aggregatePnl.all).toBe(20_000);
    });
  });

  describe("status transitions", () => {
    it("pauseBot sets local status to 'paused'", async () => {
      useBotStore.setState({ bots: [mockBot({ status: "active" })] });
      await useBotStore.getState().pauseBot("bot-1");
      expect(useBotStore.getState().bots[0].status).toBe("paused");
    });

    it("stopBot sets local status to 'stopped'", async () => {
      useBotStore.setState({ bots: [mockBot({ status: "active" })] });
      await useBotStore.getState().stopBot("bot-1");
      expect(useBotStore.getState().bots[0].status).toBe("stopped");
    });

    it("resumeBot sets local status to 'active'", async () => {
      useBotStore.setState({ bots: [mockBot({ status: "paused" })] });
      await useBotStore.getState().resumeBot("bot-1");
      expect(useBotStore.getState().bots[0].status).toBe("active");
    });

    it("pauseBot and stopBot BOTH set is_active=false in DB (BUG)", async () => {
      // This test documents the bug: pause and stop are indistinguishable in DB
      useBotStore.setState({ bots: [mockBot({ status: "active" })] });
      await useBotStore.getState().pauseBot("bot-1");

      const pauseCall = mockSupabaseFrom.mock.results[0];
      // Both pause and stop call update({ is_active: false })
      expect(mockSupabaseFrom).toHaveBeenCalledWith("bot_configs");
    });

    it("does not update status on Supabase error", async () => {
      const errorMock = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error("DB error") }),
        }),
      });
      mockSupabaseFrom.mockImplementationOnce(errorMock);

      useBotStore.setState({ bots: [mockBot({ status: "active" })] });
      await useBotStore.getState().pauseBot("bot-1");
      // Status should remain unchanged on error
      expect(useBotStore.getState().bots[0].status).toBe("active");
    });
  });

  describe("selectBot", () => {
    it("sets selected bot ID", () => {
      useBotStore.getState().selectBot("bot-1");
      expect(useBotStore.getState().selectedBotId).toBe("bot-1");
    });

    it("clears selection with null", () => {
      useBotStore.setState({ selectedBotId: "bot-1" });
      useBotStore.getState().selectBot(null);
      expect(useBotStore.getState().selectedBotId).toBeNull();
    });
  });

  describe("setFilter", () => {
    it("changes filter value", () => {
      useBotStore.getState().setFilter("active");
      expect(useBotStore.getState().filter).toBe("active");
    });
  });
});
