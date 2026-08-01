/**
 * Tests for ExecutorFactory
 *
 * Factory that creates the appropriate OrderExecutor based on trading mode.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Mock the executor classes before importing ExecutorFactory
const mockPaperExecutorInstance = { executeOrder: vi.fn() };
const mockBinanceProxyExecutorInstance = { executeOrder: vi.fn() };
const mockBinanceExecutorInstance = { executeOrder: vi.fn() };

vi.mock("../paper-executor", () => ({
  PaperExecutor: vi.fn(function () {
    return mockPaperExecutorInstance;
  }),
}));

vi.mock("../binance-proxy-executor", () => ({
  BinanceProxyExecutor: vi.fn(function () {
    return mockBinanceProxyExecutorInstance;
  }),
}));

vi.mock("../binance-executor", () => ({
  BinanceExecutor: vi.fn(function () {
    return mockBinanceExecutorInstance;
  }),
}));

// Must import after mocks are set up
const { ExecutorFactory } = await import("../executor-factory");
const { PaperExecutor } = await import("../paper-executor");
const { BinanceProxyExecutor } = await import("../binance-proxy-executor");
const { BinanceExecutor } = await import("../binance-executor");

type Supa = SupabaseClient<Database>;

function makeSupabaseMock(options?: {
  profile?: Record<string, unknown> | null;
  profileError?: Record<string, unknown> | null;
  sessionRow?: Record<string, unknown> | null;
  sessionError?: Record<string, unknown> | null;
  rpcResult?: Record<string, unknown>[] | null;
  rpcError?: Record<string, unknown> | null;
  exchangeConnection?: Record<string, unknown> | null;
  userBinanceKeys?: Record<string, unknown> | null;
}) {
  const {
    profile = {
      tier: "bachelor",
      binance_connected: true,
      binance_api_key_id: "key-id-1",
      binance_api_secret_id: "secret-id-1",
    },
    profileError = null,
    sessionRow = { user_id: "user-1", mode: "paper" },
    sessionError = null,
    rpcResult = [{ api_key: "test-api-key", api_secret: "test-api-secret", is_testnet: false }],
    rpcError = null,
    exchangeConnection = null,
    userBinanceKeys = null,
  } = options ?? {};

  const fromMock = vi.fn((table: string) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(
        table === "user_profiles"
          ? { data: profile, error: profileError }
          : table === "trading_sessions"
            ? { data: sessionRow, error: sessionError }
            : { data: null, error: null },
      ),
      maybeSingle: vi.fn().mockResolvedValue(
        table === "exchange_connections"
          ? { data: exchangeConnection, error: null }
          : table === "user_binance_keys"
            ? { data: userBinanceKeys, error: null }
            : { data: null, error: null },
      ),
    };
    return query;
  });

  return {
    from: fromMock,
    rpc: vi.fn().mockResolvedValue({
      data: rpcResult,
      error: rpcError,
    }),
  } as unknown as Supa;
}

describe("ExecutorFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default BINANCE_PROXY_ENABLED to "1"
    vi.stubEnv("BINANCE_PROXY_ENABLED", "1");
  });

  describe("create", () => {
    it("creates a PaperExecutor for paper mode without sessionId", async () => {
      const db = makeSupabaseMock();
      const executor = await ExecutorFactory.create(db, "user-1", "paper");

      expect(PaperExecutor).toHaveBeenCalledWith(db, "user-1", undefined);
      expect(executor).toBe(mockPaperExecutorInstance);
    });

    it("creates a PaperExecutor for paper mode with sessionId", async () => {
      const db = makeSupabaseMock();
      const executor = await ExecutorFactory.create(db, "user-1", "paper", "sess-1");

      expect(PaperExecutor).toHaveBeenCalledWith(db, "user-1", "sess-1");
      expect(executor).toBe(mockPaperExecutorInstance);
    });

    it("creates a BinanceProxyExecutor for live mode when proxy is enabled", async () => {
      const db = makeSupabaseMock();
      const executor = await ExecutorFactory.create(db, "user-1", "live");

      expect(BinanceProxyExecutor).toHaveBeenCalledWith(
        db,
        "user-1",
        "test-api-key",
        "test-api-secret",
        false,
      );
      expect(executor).toBe(mockBinanceProxyExecutorInstance);
    });

    it("creates a BinanceExecutor for live mode when proxy is disabled", async () => {
      vi.stubEnv("BINANCE_PROXY_ENABLED", "0");
      const db = makeSupabaseMock();
      const executor = await ExecutorFactory.create(db, "user-1", "live");

      expect(BinanceExecutor).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        apiSecret: "test-api-secret",
        testnet: false,
      });
      expect(executor).toBe(mockBinanceExecutorInstance);
    });

    it("uses testnet flag from decrypted keys", async () => {
      const db = makeSupabaseMock({
        rpcResult: [{ api_key: "key", api_secret: "secret", is_testnet: true }],
      });
      await ExecutorFactory.create(db, "user-1", "live");

      expect(BinanceProxyExecutor).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
      );
    });

    it("defaults testnet to false when is_testnet is undefined", async () => {
      const db = makeSupabaseMock({
        rpcResult: [{ api_key: "key", api_secret: "secret" }],
      });
      await ExecutorFactory.create(db, "user-1", "live");

      expect(BinanceProxyExecutor).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false,
      );
    });

    it("throws when user profile is not found", async () => {
      const db = makeSupabaseMock({ profile: null });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "User profile not found",
      );
    });

    it("throws when profile fetch has an error", async () => {
      const db = makeSupabaseMock({
        profileError: { message: "DB error", code: "PGRST116" },
      });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "User profile not found",
      );
    });

    it("throws when tier is too low for live trading", async () => {
      const db = makeSupabaseMock({
        profile: {
          tier: "free",
          binance_connected: true,
          binance_api_key_id: "key-id",
          binance_api_secret_id: "secret-id",
        },
      });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "Live trading requires Bachelor tier or higher",
      );
    });

    it("throws when binance is not connected", async () => {
      const db = makeSupabaseMock({
        profile: {
          tier: "bachelor",
          binance_connected: false,
          binance_api_key_id: "key-id",
          binance_api_secret_id: "secret-id",
        },
      });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "Binance API keys not configured",
      );
    });

    it("throws when binance API key IDs are missing", async () => {
      const db = makeSupabaseMock({
        profile: {
          tier: "bachelor",
          binance_connected: true,
          binance_api_key_id: null,
          binance_api_secret_id: null,
        },
      });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "Binance API key IDs are missing",
      );
    });

    it("throws when decrypt RPC fails", async () => {
      const db = makeSupabaseMock({
        rpcError: { message: "decrypt failed", code: "P0001" },
      });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "Failed to retrieve API keys",
      );
    });

    it("throws when decrypt returns null data", async () => {
      const db = makeSupabaseMock({ rpcResult: null });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "Failed to retrieve API keys",
      );
    });

    it("throws when decrypt returns empty array", async () => {
      const db = makeSupabaseMock({ rpcResult: [] });
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "Failed to retrieve API keys",
      );
    });
  });

  describe("createFromSession", () => {
    it("creates executor from a paper trading session", async () => {
      const db = makeSupabaseMock({
        sessionRow: { user_id: "user-1", mode: "paper" },
      });
      const executor = await ExecutorFactory.createFromSession(db, "sess-1");

      expect(db.from).toHaveBeenCalledWith("trading_sessions");
      expect(PaperExecutor).toHaveBeenCalled();
      expect(executor).toBe(mockPaperExecutorInstance);
    });

    it("creates executor from a live trading session", async () => {
      const db = makeSupabaseMock({
        sessionRow: { user_id: "user-1", mode: "live" },
      });
      const executor = await ExecutorFactory.createFromSession(db, "sess-1");

      expect(db.from).toHaveBeenCalledWith("trading_sessions");
      // Live mode -> BinanceProxyExecutor or BinanceExecutor
      expect(
        BinanceProxyExecutor).toHaveBeenCalled();
      expect(executor).toBe(mockBinanceProxyExecutorInstance);
    });

    it("throws when session is not found", async () => {
      const db = makeSupabaseMock({ sessionRow: null });
      await expect(ExecutorFactory.createFromSession(db, "sess-missing")).rejects.toThrow(
        "Trading session not found",
      );
    });

    it("throws when session fetch has error", async () => {
      const db = makeSupabaseMock({
        sessionError: { message: "DB error", code: "PGRST116" },
      });
      await expect(ExecutorFactory.createFromSession(db, "sess-err")).rejects.toThrow(
        "Trading session not found",
      );
    });
  });

  describe("canTradeLive", () => {
    it("returns true for a bachelor with binance connected", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "bachelor", binance_connected: true },
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(true);
    });

    it("returns true for a professor with binance connected", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "professor", binance_connected: true },
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(true);
    });

    it("returns false when binance is not connected", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "bachelor", binance_connected: false },
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(false);
    });

    it("returns false for free tier users", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "free", binance_connected: true },
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(false);
    });

    it("returns false when profile is null", async () => {
      const db = makeSupabaseMock({ profile: null });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(false);
    });
  });
});
