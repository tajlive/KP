import { describe, it, expect, vi } from "vitest";
import { evaluateGuardrails, DEFAULT_GUARDRAIL_CONFIG } from "../tick-guardrails";

describe("tick-guardrails", () => {
  function mockDb(trades: Array<{ realized_pnl: number | null; side: string; created_at: string }>) {
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                then: (cb: (result: { data: unknown; error: null }) => void) => cb({ data: trades, error: null }),
              })),
            })),
          })),
        })),
      })),
    } as unknown as Parameters<typeof evaluateGuardrails>[0];
  }

  it("allows trading when no trades today", async () => {
    const db = mockDb([]);
    const result = await evaluateGuardrails(db, "user-1", 10000, 10000);
    expect(result.allowed).toBe(true);
    expect(result.action).toBe("continue");
  });

  it("allows trading when within limits", async () => {
    const db = mockDb([
      { realized_pnl: 100, side: "sell", created_at: new Date().toISOString() },
      { realized_pnl: -50, side: "sell", created_at: new Date().toISOString() },
    ]);
    const result = await evaluateGuardrails(db, "user-1", 10000, 10000);
    expect(result.allowed).toBe(true);
    expect(result.action).toBe("continue");
    expect(result.metrics.dailyPnl).toBe(50);
  });

  it("kills when daily loss cap reached", async () => {
    const db = mockDb(
      Array.from({ length: 10 }, () => ({
        realized_pnl: -100,
        side: "sell" as const,
        created_at: new Date().toISOString(),
      })),
    );
    const result = await evaluateGuardrails(db, "user-1", 9000, 10000);
    expect(result.allowed).toBe(false);
    expect(result.action).toBe("kill");
    expect(result.reason).toContain("Daily loss cap");
  });

  it("warns when approaching daily loss cap", async () => {
    // 80% of -500 = -400, so -420 should trigger warn
    const db = mockDb([
      { realized_pnl: -420, side: "sell", created_at: new Date().toISOString() },
    ]);
    const result = await evaluateGuardrails(db, "user-1", 9580, 10000);
    expect(result.allowed).toBe(true);
    expect(result.action).toBe("warn");
  });

  it("kills when max drawdown reached", async () => {
    const db = mockDb([]);
    const result = await evaluateGuardrails(db, "user-1", 8400, 10000);
    expect(result.allowed).toBe(false);
    expect(result.action).toBe("kill");
    expect(result.reason).toContain("drawdown");
    expect(result.metrics.drawdownPct).toBe(0.16);
  });

  it("pauses when consecutive losses exceed limit", async () => {
    const db = mockDb(
      Array.from({ length: 6 }, () => ({
        realized_pnl: -10,
        side: "sell" as const,
        created_at: new Date().toISOString(),
      })),
    );
    const result = await evaluateGuardrails(db, "user-1", 9940, 10000);
    expect(result.allowed).toBe(false);
    expect(result.action).toBe("pause");
    expect(result.reason).toContain("Consecutive losses");
    expect(result.metrics.consecutiveLosses).toBe(6);
  });

  it("counts consecutive losses from most recent only", async () => {
    const db = mockDb([
      { realized_pnl: -10, side: "sell", created_at: new Date().toISOString() },
      { realized_pnl: -10, side: "sell", created_at: new Date().toISOString() },
      { realized_pnl: 50, side: "sell", created_at: new Date().toISOString() }, // break streak
      { realized_pnl: -10, side: "sell", created_at: new Date().toISOString() },
    ]);
    const result = await evaluateGuardrails(db, "user-1", 10000, 10000);
    expect(result.allowed).toBe(true);
    expect(result.metrics.consecutiveLosses).toBe(2);
  });
});
