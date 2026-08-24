import { describe, it, expect, vi } from "vitest";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";

// Set dogfood mode to false for tests (old behavior - no dogfood gate)
vi.stubEnv("NEXT_PUBLIC_LIVE_TRADING_DOGFOOD", "false");

function makeSupabaseMock(
  profile: object | null,
  entitlements: object[] | null,
  rpcError = false,
  krakenKeys: object | null = { user_id: "u1" },
) {
  return {
    from: vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() =>
          Promise.resolve({
            data: profile,
            error: profile ? null : { message: "not found" },
          }),
        ),
        maybeSingle: vi.fn(() =>
          Promise.resolve({
            data: table === "user_kraken_keys" ? krakenKeys : null,
            error: null,
          }),
        ),
      };
      return chain;
    }),
    rpc: vi.fn(() =>
      Promise.resolve({
        data: entitlements,
        error: rpcError ? { message: "rpc error" } : null,
      }),
    ),
  } as unknown as Parameters<typeof verifyLiveEntitlement>[0];
}

describe("verifyLiveEntitlement", () => {
  it("returns false when profile is missing", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(null, null),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when tier cannot access live auto-trading", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "student" }, [{ auto_trade_allow_live: true }]),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when kraken keys are missing", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(
        { tier: "bachelor" },
        [{ auto_trade_allow_live: true }],
        false,
        null,
      ),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when entitlements RPC fails", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "bachelor" }, null, true),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when auto_trade_allow_live is false", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "bachelor" }, [
        { auto_trade_allow_live: false },
      ]),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns true when all checks pass", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "bachelor" }, [{ auto_trade_allow_live: true }]),
      "u1",
    );
    expect(result).toBe(true);
  });

  it("returns true for professor tier without kraken keys", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock({ tier: "professor" }, null, false, null),
      "u1",
    );
    expect(result).toBe(true);
  });
});
