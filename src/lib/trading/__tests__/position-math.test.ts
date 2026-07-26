import { describe, expect, it } from "vitest";
import {
  applyBuyToPosition,
  applySellToPosition,
  deriveQuantityFromTrades,
  quantityDeviation,
} from "../position-math";

/**
 * F2-regresjon (prod 2026-07-25): open_position.quantity var ~541× reelt
 * kjøp (34,65 ETH vs 0,064 ETH). Disse testene låser den korrekte
 * posisjonssemantikken som DB-triggeren nå speiler.
 */
describe("applyBuyToPosition", () => {
  it("kjøp av X enheter → quantity er nøyaktig X (regresjon F2)", () => {
    const pos = applyBuyToPosition(null, {
      side: "buy",
      quantity: 0.06399361,
      price: 17991.22563,
      executed_at: "2026-07-25T23:55:05.310Z",
    });
    expect(pos.quantity).toBe(0.06399361);
    expect(pos.entry_price).toBe(17991.22563);
    expect(pos.entry_time).toBe("2026-07-25T23:55:05.310Z");
    expect(pos.highest_price).toBe(17991.22563);
  });

  it("gjentatte kjøp: quantity summeres, entry_price er vektet snitt", () => {
    let pos = applyBuyToPosition(null, {
      side: "buy",
      quantity: 1,
      price: 100,
      executed_at: "2026-07-01T00:00:00Z",
    });
    pos = applyBuyToPosition(pos, {
      side: "buy",
      quantity: 3,
      price: 200,
      executed_at: "2026-07-02T00:00:00Z",
    });
    expect(pos.quantity).toBe(4);
    // (1*100 + 3*200) / 4 = 175 — ALDRI "siste pris" (200)
    expect(pos.entry_price).toBe(175);
    // entry_time beholdes fra første kjøp
    expect(pos.entry_time).toBe("2026-07-01T00:00:00Z");
    // highest_price oppdateres
    expect(pos.highest_price).toBe(200);
  });

  it("kaster på ugyldige kjøp (0/negativ mengde eller pris)", () => {
    expect(() =>
      applyBuyToPosition(null, {
        side: "buy",
        quantity: 0,
        price: 100,
        executed_at: "2026-07-01T00:00:00Z",
      }),
    ).toThrow();
    expect(() =>
      applyBuyToPosition(null, {
        side: "buy",
        quantity: 1,
        price: 0,
        executed_at: "2026-07-01T00:00:00Z",
      }),
    ).toThrow();
  });
});

describe("applySellToPosition", () => {
  it("salg reduserer quantity, entry_price/entry_time beholdes", () => {
    const pos = applyBuyToPosition(null, {
      side: "buy",
      quantity: 2,
      price: 100,
      executed_at: "2026-07-01T00:00:00Z",
    });
    const after = applySellToPosition(pos, {
      side: "sell",
      quantity: 0.5,
      price: 120,
      executed_at: "2026-07-02T00:00:00Z",
    });
    expect(after).not.toBeNull();
    expect(after!.quantity).toBe(1.5);
    expect(after!.entry_price).toBe(100);
    expect(after!.entry_time).toBe("2026-07-01T00:00:00Z");
  });

  it("alt solgt → null", () => {
    const pos = applyBuyToPosition(null, {
      side: "buy",
      quantity: 1,
      price: 100,
      executed_at: "2026-07-01T00:00:00Z",
    });
    expect(
      applySellToPosition(pos, {
        side: "sell",
        quantity: 1,
        price: 110,
        executed_at: "2026-07-02T00:00:00Z",
      }),
    ).toBeNull();
  });
});

describe("deriveQuantityFromTrades (phantom-guard)", () => {
  it("summerer kjøp minus salg, clampet til 0", () => {
    expect(
      deriveQuantityFromTrades([
        { side: "buy", quantity: 0.06399361, price: 17991.23, executed_at: "2026-07-25T23:55:05Z" },
      ]),
    ).toBeCloseTo(0.06399361, 10);
    expect(
      deriveQuantityFromTrades([
        { side: "buy", quantity: 1, price: 100, executed_at: "2026-07-01T00:00:00Z" },
        { side: "sell", quantity: 0.4, price: 110, executed_at: "2026-07-02T00:00:00Z" },
      ]),
    ).toBeCloseTo(0.6, 10);
    expect(deriveQuantityFromTrades([])).toBeNull();
    expect(
      deriveQuantityFromTrades([
        { side: "sell", quantity: 5, price: 100, executed_at: "2026-07-01T00:00:00Z" },
      ]),
    ).toBe(0);
  });
});

describe("quantityDeviation", () => {
  it("fanger 541× phantom-avvik, ignorerer små diff", () => {
    expect(quantityDeviation(34.64663961, 0.06399361)).toBeGreaterThan(0.98);
    expect(quantityDeviation(1.0, 0.995)).toBeLessThan(0.01);
    expect(quantityDeviation(0, 0)).toBe(0);
  });
});
