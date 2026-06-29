import { describe, it, expect, vi } from "vitest";
import { verifyLiveEntitlement } from "@/lib/auth/live-trading";

function makeSupabaseMock(
  profile: object | null,
  entitlements: object[] | null,
  rpcError = false,
) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: profile,
              error: profile ? null : { message: "not found" },
            }),
          ),
        })),
      })),
    })),
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
    const result = await verifyLiveEntitlement(makeSupabaseMock(null, null), "u1");
    expect(result).toBe(false);
  });

  it("returns false when tier cannot access live auto-trading", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(
        { tier: "student", binance_connected: true },
        [{ auto_trade_allow_live: true }],
      ),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when binance is not connected", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(
        { tier: "bachelor", binance_connected: false },
        [{ auto_trade_allow_live: true }],
      ),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when entitlements RPC fails", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(
        { tier: "bachelor", binance_connected: true },
        null,
        true,
      ),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns false when auto_trade_allow_live is false", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(
        { tier: "bachelor", binance_connected: true },
        [{ auto_trade_allow_live: false }],
      ),
      "u1",
    );
    expect(result).toBe(false);
  });

  it("returns true when all checks pass", async () => {
    const result = await verifyLiveEntitlement(
      makeSupabaseMock(
        { tier: "bachelor", binance_connected: true },
        [{ auto_trade_allow_live: true }],
      ),
      "u1",
    );
    expect(result).toBe(true);
  });
});
