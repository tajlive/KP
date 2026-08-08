/**
 * Tests for ExecutorFactory
 *
 * Factory that creates the appropriate OrderExecutor based on trading mode.
 *
 * EU/EØS-fakta (2026): Kraken er eneste børs (MiCA).
 * Kraken er Klarpakkes ENESTE live-børs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Mock the executor classes before importing ExecutorFactory
const mockPaperExecutorInstance = { executeOrder: vi.fn() };
const mockKrakenExecutorInstance = { executeOrder: vi.fn() };

vi.mock("../paper-executor", () => ({
  PaperExecutor: vi.fn(function () {
    return mockPaperExecutorInstance;
  }),
}));

vi.mock("../kraken-executor", () => ({
  KrakenExecutor: {
    fromUser: vi.fn(),
  },
}));

// Must import after mocks are set up
const { ExecutorFactory } = await import("../executor-factory");
const { PaperExecutor } = await import("../paper-executor");
const { KrakenExecutor } = await import("../kraken-executor");

type Supa = SupabaseClient<Database>;

function makeSupabaseMock(options?: {
  profile?: Record<string, unknown> | null;
  profileError?: Record<string, unknown> | null;
  sessionRow?: Record<string, unknown> | null;
  sessionError?: Record<string, unknown> | null;
  krakenKeysRow?: Record<string, unknown> | null;
}) {
  const {
    profile = { tier: "bachelor" },
    profileError = null,
    sessionRow = { user_id: "user-1", mode: "paper" },
    sessionError = null,
    krakenKeysRow = null,
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
        table === "user_kraken_keys"
          ? { data: krakenKeysRow, error: null }
          : { data: null, error: null },
      ),
    };
    return query;
  });

  return {
    from: fromMock,
  } as unknown as Supa;
}

describe("ExecutorFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: ingen Kraken-nøkler
    vi.mocked(KrakenExecutor.fromUser).mockResolvedValue(null);
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

    it("creates a KrakenExecutor for live mode when Kraken keys exist (EU/EØS-sannhet)", async () => {
      vi.mocked(KrakenExecutor.fromUser).mockResolvedValue(
        mockKrakenExecutorInstance as never,
      );
      const db = makeSupabaseMock();
      const executor = await ExecutorFactory.create(db, "user-1", "live");

      expect(KrakenExecutor.fromUser).toHaveBeenCalledWith(db, "user-1");
      expect(executor).toBe(mockKrakenExecutorInstance);
    });

    it("throws when no Kraken keys exist for live mode", async () => {
      const db = makeSupabaseMock();
      await expect(ExecutorFactory.create(db, "user-1", "live")).rejects.toThrow(
        "No exchange keys configured. Please connect your exchange first.",
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

    it("creates executor from a live trading session via Kraken", async () => {
      vi.mocked(KrakenExecutor.fromUser).mockResolvedValue(
        mockKrakenExecutorInstance as never,
      );
      const db = makeSupabaseMock({
        sessionRow: { user_id: "user-1", mode: "live" },
      });
      const executor = await ExecutorFactory.createFromSession(db, "sess-1");

      expect(db.from).toHaveBeenCalledWith("trading_sessions");
      expect(KrakenExecutor.fromUser).toHaveBeenCalledWith(db, "user-1");
      expect(executor).toBe(mockKrakenExecutorInstance);
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
    it("returns true for a bachelor with Kraken keys", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "bachelor" },
        krakenKeysRow: { id: "kraken-key-1" },
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(true);
    });

    it("returns true for a professor with Kraken keys", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "professor" },
        krakenKeysRow: { id: "kraken-key-1" },
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(true);
    });

    it("returns false when Kraken keys are missing", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "bachelor" },
        krakenKeysRow: null,
      });
      const result = await ExecutorFactory.canTradeLive(db, "user-1");
      expect(result).toBe(false);
    });

    it("returns false for free tier users even with Kraken keys", async () => {
      const db = makeSupabaseMock({
        profile: { tier: "free" },
        krakenKeysRow: { id: "kraken-key-1" },
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
