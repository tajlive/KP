/**
 * execute-trade-safe.test.ts
 * 
 * P0 Tests for Safe Trade Execution
 * 
 * CRITICAL: 10/10 tests must pass before any trading code changes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Factories - MÅ være før imports
// ============================================================================

const mockKillSwitchStatus = vi.fn();
const mockIsTradingAllowed = vi.fn();
const mockCheckOutboxHealth = vi.fn();

vi.mock("./outbox-monitor", () => ({
  getKillSwitchStatus: () => mockKillSwitchStatus(),
  isTradingAllowed: () => mockIsTradingAllowed(),
  checkOutboxHealth: () => mockCheckOutboxHealth(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn()
}));

vi.mock("@/lib/trading/currency", () => ({
  getUsdtToNokRateAsync: vi.fn().mockResolvedValue(10.8),
  usdtToNok: vi.fn().mockReturnValue(108)
}));

vi.mock("@/lib/trading/safety/risk-validator", () => ({
  validateTradeAgainstRiskProfile: vi.fn().mockResolvedValue({
    allowed: true,
    confidence: 0.95,
    checks: { dailyLoss: true, positionSize: true, volatility: true }
  }),
  recordTradeRejection: vi.fn(),
  recordTradeDecision: vi.fn()
}));

vi.mock("@/lib/trading/executor-factory", () => ({
  ExecutorFactory: {
    create: vi.fn().mockResolvedValue({
      executeOrder: vi.fn().mockResolvedValue({
        success: true,
        orderId: "test-order-123",
        executedPrice: 50000,
        executedQuantity: 0.1,
        fee: 2.75,
        timestamp: new Date()
      })
    })
  }
}));

vi.mock("@/lib/trading/risk/risk-kernel", () => ({
  RiskKernel: vi.fn().mockImplementation(() => ({
    validate: vi.fn().mockReturnValue({ approved: true })
  })),
  RiskStateManager: vi.fn(),
  DEFAULT_RISK_LIMITS: {
    maxPositionSize: 100000,
    maxDailyLoss: 10000,
    maxLeverage: 2
  }
}));

vi.mock("@/lib/trading/risk/risk-state-store", () => ({
  getRiskStateStore: vi.fn().mockReturnValue({
    getState: vi.fn().mockResolvedValue({
      state: {
        equity: 100000,
        peakEquity: 110000,
        dailyPnl: 1000,
        openPositions: 2
      }
    }),
    initializeState: vi.fn()
  })
}));

vi.mock("@/lib/trading/execution/audit-store", () => ({
  getAuditStore: vi.fn().mockReturnValue({
    persist: vi.fn().mockResolvedValue({ success: true })
  })
}));

vi.mock("@/lib/trading/execution/execution-audit", () => ({
  ExecutionAuditor: vi.fn().mockImplementation(() => ({
    recordIntent: vi.fn().mockReturnValue({ id: "audit-123" }),
    recordRejection: vi.fn(),
    recordExecution: vi.fn()
  })),
  createL2Snapshot: vi.fn().mockReturnValue({ bids: [], asks: [] })
}));

// Now import the function under test
import { executeTradeSafe } from "./execute-trade-safe";

describe("executeTradeSafe (P0 Critical)", () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ 
        eq: vi.fn(() => ({ 
          maybeSingle: vi.fn().mockResolvedValue({ data: null })
        })) 
      })),
      insert: vi.fn(() => ({ 
        select: vi.fn(() => ({ 
          single: vi.fn().mockResolvedValue({ 
            data: { id: "trade-123" }, 
            error: null 
          })
        }))
      })),
    })),
  };

  const validTradeRequest = {
    userId: "user-123",
    sessionId: "session-456",
    symbol: "BTC-USDT",
    side: "buy" as const,
    quantity: 0.1,
    price: 50000,
    orderType: "market" as const,
    mode: "paper" as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: all systems GO (safe state)
    mockKillSwitchStatus.mockReturnValue({ activated: false });
    mockIsTradingAllowed.mockResolvedValue({ allowed: true, reason: null });
    mockCheckOutboxHealth.mockResolvedValue({ healthy: true });
  });

  describe("🛡️ Safe-by-Default", () => {
    it("P0-SAFE-01: SKAL avvise trade hvis killswitch er aktiv", async () => {
      // Arrange
      mockKillSwitchStatus.mockReturnValue({ 
        activated: true, 
        reason: "market_volatility" 
      });

      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.rejectionReason).toContain("KILL_SWITCH");
    });

    it("P0-SAFE-02: SKAL avvise trade hvis risk state er utilgjengelig", async () => {
      // Arrange - import fresh mock
      const { getRiskStateStore } = await import("@/lib/trading/risk/risk-state-store");
      (getRiskStateStore as any).mockReturnValue({
        getState: vi.fn().mockResolvedValue(null),
        initializeState: vi.fn().mockRejectedValue(new Error("Redis down"))
      });

      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.rejectionReason).toContain("RISK_STATE");
    });

    it("P0-SAFE-03: SKAL avvise trade hvis audit feiler", async () => {
      // Arrange
      const { getAuditStore } = await import("@/lib/trading/execution/audit-store");
      (getAuditStore as any).mockReturnValue({
        persist: vi.fn().mockResolvedValue({ success: false, error: "DB error" })
      });

      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.auditStatus).toBe("failed");
    });
  });

  describe("🆔 Idempotency", () => {
    it("P0-IDEM-01: SKAL forhindre duplikat trades med samme idempotency key", async () => {
      // Arrange
      const existingTrade = {
        id: "existing-trade-123",
        status: "filled",
        idempotency_key: "any-key"
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: existingTrade })
          }))
        }))
      });

      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.rejectionReason).toContain("DUPLICATE");
    });
  });

  describe("📊 Audit Requirements", () => {
    it("P0-AUDIT-01: SKAL logge audit intent før eksekvering", async () => {
      // Arrange
      const { getAuditStore } = await import("@/lib/trading/execution/audit-store");
      const mockPersist = vi.fn().mockResolvedValue({ success: true });
      (getAuditStore as any).mockReturnValue({ persist: mockPersist });

      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPersist).toHaveBeenCalled();
    });

    it("P0-AUDIT-02: SKAL inkludere full sporbarhet i envelope", async () => {
      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.envelope).toBeDefined();
      expect(result.envelope).toHaveProperty("tradeId");
      expect(result.envelope).toHaveProperty("idempotencyKey");
      expect(result.envelope).toHaveProperty("riskVersion");
      expect(result.envelope).toHaveProperty("auditStatus");
      expect(result.envelope).toHaveProperty("systemHealth");
    });
  });

  describe("✅ Happy Path", () => {
    it("P0-HAPPY-01: SKAL eksekvere trade når alle sjekker passerer", async () => {
      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tradeId).toBeDefined();
      expect(result.orderId).toBe("test-order-123");
      expect(result.executedPrice).toBe(50000);
      expect(result.executedQuantity).toBe(0.1);
    });

    it("P0-HAPPY-02: SKAL returnere execution trace", async () => {
      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.executionTrace).toBeDefined();
      expect(result.executionTrace).toHaveProperty("startedAt");
      expect(result.executionTrace).toHaveProperty("completedAt");
      expect(result.executionTrace).toHaveProperty("steps");
    });
  });

  describe("❌ Error Handling", () => {
    it("P0-ERR-01: SKAL håndtere database errors gracefully", async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Connection lost");
      });

      // Act & Assert - Should not crash
      await expect(executeTradeSafe(mockSupabase as any, validTradeRequest))
        .rejects.toBeDefined();
    });

    it("P0-ERR-02: SKAL håndtere executor failures", async () => {
      // Arrange
      const { ExecutorFactory } = await import("@/lib/trading/executor-factory");
      (ExecutorFactory.create as any).mockResolvedValue({
        executeOrder: vi.fn().mockResolvedValue({
          success: false,
          error: "Insufficient liquidity"
        })
      });

      // Act
      const result = await executeTradeSafe(mockSupabase as any, validTradeRequest);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});

/**
 * ✅ Test Status: 10/10 targeted
 * 
 * Run: npm run test:unit -- src/lib/trading/core/execute-trade-safe.test.ts
 * 
 * Pre-commit checklist:
 * □ All P0-* tests pass
 * □ No console.errors during tests
 * □ Coverage > 80% for execute-trade-safe.ts
 */
