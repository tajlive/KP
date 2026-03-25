/**
 * KLA-137: Trading Safety Core Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateTradeAgainstRiskProfile,
  type TradeRequest,
} from "../risk-validator";

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockSupabase,
}));

vi.mock("@/lib/sentry", () => ({
  logError: vi.fn(),
  logMessage: vi.fn(),
}));

describe("KLA-137 Trading Safety Core", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Risk Validation", () => {
    it("should reject trade when session not found", async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => ({ data: null, error: { code: "PGRST116" } }),
            }),
          }),
        }),
      });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.1,
        price: 50000,
        orderType: "market",
        tradingMode: "paper",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toBe("SESSION_NOT_ACTIVE");
    });

    it("should reject trade when trading mode mismatch", async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => ({
                data: {
                  id: "session-1",
                  user_id: "user-1",
                  mode: "paper", // Session is paper
                  status: "active",
                  current_capital_nok: 100000,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.1,
        price: 50000,
        orderType: "market",
        tradingMode: "live", // But trying to trade live
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toBe("INVALID_TRADING_MODE");
    });

    it("should allow valid paper trade", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "paper",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "profile-1",
                      name: "forsiktig",
                      max_position_pct: 5,
                      max_exposure_pct: 15,
                      max_daily_loss_pct: 3,
                      allowed_pairs: ["BTCUSDT", "ETHUSDT"],
                      leverage_allowed: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockReturnValue({ data: 0, error: null });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001, // Small amount
        price: 50000,
        orderType: "market",
        tradingMode: "paper",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(true);
      expect(result.riskProfileId).toBeDefined();
    });

    it("paper: SOL allowed when profile only lists BTC/ETH (union with PAPER_TRADING_UI_SYMBOLS)", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "paper",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "profile-1",
                      name: "forsiktig",
                      max_position_pct: 5,
                      max_exposure_pct: 15,
                      max_daily_loss_pct: 3,
                      allowed_pairs: ["BTCUSDT", "ETHUSDT"],
                      leverage_allowed: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockReturnValue({ data: 0, error: null });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "SOLUSDT",
        side: "buy",
        quantity: 0.05,
        price: 150,
        orderType: "market",
        tradingMode: "paper",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(true);
    });

    it("live: SOL still rejected when profile only lists BTC/ETH", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "live",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "profile-1",
                      name: "forsiktig",
                      max_position_pct: 5,
                      max_exposure_pct: 15,
                      max_daily_loss_pct: 3,
                      allowed_pairs: ["BTCUSDT", "ETHUSDT"],
                      leverage_allowed: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockReturnValue({ data: 0, error: null });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "SOLUSDT",
        side: "buy",
        quantity: 0.05,
        price: 150,
        orderType: "market",
        tradingMode: "live",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toBe("PAIR_NOT_ALLOWED");
    });

    it("should reject with DAILY_LOSS_CHECK_FAILED when calculate_daily_loss RPC errors (live only)", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "live",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "profile-1",
                      name: "forsiktig",
                      max_position_pct: 5,
                      max_exposure_pct: 15,
                      max_daily_loss_pct: 3,
                      allowed_pairs: ["BTCUSDT", "ETHUSDT"],
                      leverage_allowed: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'relation "trades" does not exist' },
      });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        price: 50000,
        orderType: "market",
        tradingMode: "live",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toBe("DAILY_LOSS_CHECK_FAILED");
      expect(result.rejectionDetails?.error).toContain("does not exist");
    });

    it("paper without risk profile: large notional still allowed (demo defaults)", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "paper",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: null,
                    error: { code: "PGRST116", message: "No rows" },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockReturnValue({ data: 0, error: null });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "SOLUSDT",
        side: "buy",
        quantity: 2,
        price: 150,
        orderType: "market",
        tradingMode: "paper",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(true);
    });

    it("should reject with DAILY_LOSS_CHECK_FAILED when calculate_daily_loss returns null data (live only)", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "live",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "profile-1",
                      name: "forsiktig",
                      max_position_pct: 5,
                      max_exposure_pct: 15,
                      max_daily_loss_pct: 3,
                      allowed_pairs: ["BTCUSDT", "ETHUSDT"],
                      leverage_allowed: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        price: 50000,
        orderType: "market",
        tradingMode: "live",
      };

      const result = await validateTradeAgainstRiskProfile(trade);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toBe("DAILY_LOSS_CHECK_FAILED");
    });

    it("paper: skips calculate_daily_loss — RPC error must not block", async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "trading_sessions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "session-1",
                      user_id: "user-1",
                      mode: "paper",
                      status: "active",
                      current_capital_nok: 100000,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "risk_profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: () => ({
                    data: {
                      id: "profile-1",
                      name: "forsiktig",
                      max_position_pct: 2,
                      max_exposure_pct: 5,
                      max_daily_loss_pct: 1,
                      allowed_pairs: ["BTCUSDT"],
                      leverage_allowed: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "positions") {
          return {
            select: () => ({
              eq: () => ({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { eq: () => ({ single: () => ({ data: null }) }) };
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "rpc failed" },
      });

      const trade: TradeRequest = {
        userId: "user-1",
        sessionId: "session-1",
        symbol: "BTCUSDT",
        side: "buy",
        quantity: 0.001,
        price: 50000,
        orderType: "market",
        tradingMode: "paper",
      };

      const result = await validateTradeAgainstRiskProfile(trade);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Physical Separation", () => {
    it("should have separate paths for paper and live execution", async () => {
      const { executePaperTrade } = await import("../execute-paper-trade");
      const { executeLiveTrade } = await import("../execute-live-trade");

      expect(executePaperTrade).toBeDefined();
      expect(executeLiveTrade).toBeDefined();
      expect(executePaperTrade).not.toBe(executeLiveTrade);
    });
  });

  describe("Fail Closed", () => {
    it("should reject trade on unexpected error", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        mockSupabase.from.mockImplementation(() => {
          throw new Error("Database connection failed");
        });

        const trade: TradeRequest = {
          userId: "user-1",
          sessionId: "session-1",
          symbol: "BTCUSDT",
          side: "buy",
          quantity: 0.1,
          price: 50000,
          orderType: "market",
          tradingMode: "paper",
        };

        const result = await validateTradeAgainstRiskProfile(trade);

        expect(result.allowed).toBe(false);
      } finally {
        errSpy.mockRestore();
      }
    });
  });
});
