/**
 * P0 Money Guardrails — tester
 *
 * Verifiserer:
 * 1. Ukjent kilde → unknown
 * 2. Upålitelig kilde (Kraken) → unknown
 * 3. Stale data → stale
 * 4. Fersk data med kjent kilde → verified
 */
import { describe, it, expect } from "vitest";
import { assessMoneyDataHealth } from "@/lib/trading/money-data-health";

const NOW = Date.now();
const fiveMinAgo = new Date(NOW - 5 * 60 * 1000).toISOString();
const tenMinAgo = new Date(NOW - 10 * 60 * 1000).toISOString();
const oneHourAgo = new Date(NOW - 60 * 60 * 1000).toISOString();

describe("assessMoneyDataHealth", () => {
  it("ukjent kilde → unknown", () => {
    expect(
      assessMoneyDataHealth({
        source: null,
        updatedAt: fiveMinAgo,
        currency: "NOK",
        value: 100,
      }),
    ).toBe("unknown");
  });

  it("upålitelig kilde (kraken_live_state) → unknown", () => {
    expect(
      assessMoneyDataHealth({
        source: "kraken_live_state",
        updatedAt: fiveMinAgo,
        currency: "USDC",
        value: 152.62,
      }),
    ).toBe("unknown");
  });

  it("manglende verdi → unknown", () => {
    expect(
      assessMoneyDataHealth({
        source: "paper_accounts",
        updatedAt: fiveMinAgo,
        currency: "NOK",
        value: null,
      }),
    ).toBe("unknown");
  });

  it("manglende valuta → unknown", () => {
    expect(
      assessMoneyDataHealth({
        source: "paper_accounts",
        updatedAt: fiveMinAgo,
        currency: null,
        value: 100,
      }),
    ).toBe("unknown");
  });

  it("stale paper_accounts (> 6 min) → stale", () => {
    expect(
      assessMoneyDataHealth({
        source: "paper_accounts",
        updatedAt: oneHourAgo,
        currency: "NOK",
        value: 100000,
      }),
    ).toBe("stale");
  });

  it("fersk paper_accounts (5 min) → verified", () => {
    expect(
      assessMoneyDataHealth({
        source: "paper_accounts",
        updatedAt: fiveMinAgo,
        currency: "NOK",
        value: 100000,
      }),
    ).toBe("verified");
  });

  it("fersk OKX live (< 5 min) → verified", () => {
    const fresh = new Date(NOW - 30 * 1000).toISOString();
    expect(
      assessMoneyDataHealth({
        source: "OKX live",
        updatedAt: fresh,
        currency: "USDC",
        value: 101.66,
      }),
    ).toBe("verified");
  });

  it("stale OKX live (> 5 min) → stale", () => {
    expect(
      assessMoneyDataHealth({
        source: "OKX live",
        updatedAt: tenMinAgo,
        currency: "USDC",
        value: 101.66,
      }),
    ).toBe("stale");
  });
});
