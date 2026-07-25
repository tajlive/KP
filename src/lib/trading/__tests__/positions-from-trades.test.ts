import { describe, expect, it } from "vitest";
import { computePositionsFromTrades } from "../positions-from-trades";

interface TestTrade {
  side: "buy" | "sell";
  quantity: number;
  price: number;
  trading_pair: string;
  created_at: string;
}

function t(partial: Partial<TestTrade>): TestTrade {
  return {
    side: "buy",
    quantity: 0.01,
    price: 600000,
    trading_pair: "BTCUSDT",
    created_at: "2026-07-20T10:00:00Z",
    ...partial,
  };
}

describe("computePositionsFromTrades", () => {
  it("én kjøp → én posisjon", () => {
    const positions = computePositionsFromTrades([t({})]);
    expect(positions).toHaveLength(1);
    expect(positions[0].pair).toBe("BTCUSDT");
    expect(positions[0].quantity).toBeCloseTo(0.01, 8);
    expect(positions[0].avg_entry_price).toBe(600000);
    expect(positions[0].cost_basis_nok).toBeCloseTo(6000, 2);
    expect(positions[0].oldest_entry_at).toBe("2026-07-20T10:00:00Z");
  });

  it("kjøp + delvis salg (FIFO): gjenstående mengde fra siste lot", () => {
    const positions = computePositionsFromTrades([
      t({ quantity: 0.01, price: 600000, created_at: "2026-07-18T10:00:00Z" }),
      t({ quantity: 0.01, price: 640000, created_at: "2026-07-20T10:00:00Z" }),
      t({
        side: "sell",
        quantity: 0.015,
        price: 700000,
        created_at: "2026-07-22T10:00:00Z",
      }),
    ]);
    expect(positions).toHaveLength(1);
    // Solgt 0.015 FIFO: hele lot 1 (0.01 @ 600k) + halve lot 2 →
    // igjen: 0.005 @ 640000
    expect(positions[0].quantity).toBeCloseTo(0.005, 8);
    expect(positions[0].avg_entry_price).toBeCloseTo(640000, 2);
    expect(positions[0].cost_basis_nok).toBeCloseTo(3200, 2);
    // Eldste gjenstående inngang er lot 2 sitt tidspunkt
    expect(positions[0].oldest_entry_at).toBe("2026-07-20T10:00:00Z");
  });

  it("to par → to uavhengige posisjoner", () => {
    const positions = computePositionsFromTrades([
      t({ trading_pair: "BTCUSDT" }),
      t({ trading_pair: "AVAXUSDT", quantity: 10, price: 250 }),
    ]);
    expect(positions).toHaveLength(2);
    expect(positions.map((p) => p.pair).sort()).toEqual([
      "AVAXUSDT",
      "BTCUSDT",
    ]);
  });

  it("alt solgt → ingen posisjon", () => {
    const positions = computePositionsFromTrades([
      t({ quantity: 0.01 }),
      t({ side: "sell", quantity: 0.01, created_at: "2026-07-21T10:00:00Z" }),
    ]);
    expect(positions).toHaveLength(0);
  });

  it("prod-tilfellet: 4 kjøp 0 salg → én posisjon med vektet snitt", () => {
    // Toms aktive-sesjon-kjøp (verifisert i prod 2026-07-25)
    const positions = computePositionsFromTrades([
      t({ quantity: 0.0077, price: 623603, created_at: "2026-07-19T22:40:00Z" }),
      t({ quantity: 0.0077, price: 625386, created_at: "2026-07-20T04:25:00Z" }),
      t({ quantity: 0.0120, price: 631188, created_at: "2026-07-20T20:07:00Z" }),
      t({ quantity: 0.0047, price: 613978, created_at: "2026-07-25T08:15:00Z" }),
    ]);
    expect(positions).toHaveLength(1);
    const p = positions[0];
    expect(p.quantity).toBeCloseTo(0.0321, 8);
    const expectedAvg =
      (0.0077 * 623603 + 0.0077 * 625386 + 0.0120 * 631188 + 0.0047 * 613978) /
      0.0321;
    expect(p.avg_entry_price).toBeCloseTo(expectedAvg, 2);
    expect(p.oldest_entry_at).toBe("2026-07-19T22:40:00Z");
  });

  it("par-format normaliseres (BTC/USDT og BTCUSDT slås sammen)", () => {
    const positions = computePositionsFromTrades([
      t({ trading_pair: "BTC/USDT" }),
      t({ trading_pair: "BTCUSDT", created_at: "2026-07-21T10:00:00Z" }),
    ]);
    expect(positions).toHaveLength(1);
    expect(positions[0].quantity).toBeCloseTo(0.02, 8);
  });

  it("salg større enn beholdning clampes til 0 (ingen negativ posisjon)", () => {
    const positions = computePositionsFromTrades([
      t({ quantity: 0.01 }),
      t({ side: "sell", quantity: 0.05, created_at: "2026-07-21T10:00:00Z" }),
    ]);
    expect(positions).toHaveLength(0);
  });

  it("rekkefølge uavhengig: sorterer på created_at selv om input er omvendt", () => {
    const positions = computePositionsFromTrades([
      t({ quantity: 0.01, price: 640000, created_at: "2026-07-20T10:00:00Z" }),
      t({ quantity: 0.01, price: 600000, created_at: "2026-07-18T10:00:00Z" }),
    ]);
    expect(positions[0].oldest_entry_at).toBe("2026-07-18T10:00:00Z");
    expect(positions[0].avg_entry_price).toBeCloseTo(620000, 2);
  });
});
