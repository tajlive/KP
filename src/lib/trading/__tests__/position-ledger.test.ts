/**
 * Tests for FIFO Position Ledger
 */

import { describe, it, expect } from "vitest";
import {
  createLedger,
  addLot,
  sellFIFO,
  getTotalQuantity,
  getWeightedEntryPrice,
  getUnrealizedPnl,
  getUnrealizedPnlPct,
  isEmpty,
  migrateFromLegacy,
  toLegacyPosition,
  InsufficientQuantityError,
} from "../position-ledger";

describe("Position Ledger — FIFO Cost Basis", () => {
  describe("createLedger", () => {
    it("should create empty ledger with default side", () => {
      const ledger = createLedger();
      expect(ledger.lots).toEqual([]);
      expect(ledger.side).toBe("long");
    });

    it("should create empty ledger with specified side", () => {
      const ledger = createLedger("short");
      expect(ledger.side).toBe("short");
    });
  });

  describe("addLot", () => {
    it("should add a lot to empty ledger", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");

      expect(state.lots).toHaveLength(1);
      expect(state.lots[0].quantity).toBe(0.5);
      expect(state.lots[0].entryPrice).toBe(80000);
      expect(state.lots[0].originalQuantity).toBe(0.5);
    });

    it("should add multiple lots in FIFO order", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.3, 85000, "2025-01-02T00:00:00Z");

      expect(state.lots).toHaveLength(2);
      expect(state.lots[0].entryPrice).toBe(80000); // oldest first
      expect(state.lots[1].entryPrice).toBe(85000);
    });

    it("should ignore zero or negative quantity", () => {
      let state = createLedger();
      state = addLot(state, 0, 80000);
      state = addLot(state, -1, 80000);

      expect(state.lots).toHaveLength(0);
    });
  });

  describe("sellFIFO — Full sells", () => {
    it("should sell entire single lot", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");

      const result = sellFIFO(state, 0.5, 90000);

      expect(result.realizedPnl).toBe(5000); // (90000 - 80000) * 0.5
      expect(result.lotMatches).toHaveLength(1);
      expect(result.remainingLots).toHaveLength(0);
      expect(result.remainingQuantity).toBe(0);
    });

    it("should sell across multiple lots FIFO", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.3, 85000, "2025-01-02T00:00:00Z");

      // Sell all 0.8 at 90000
      const result = sellFIFO(state, 0.8, 90000);

      expect(result.lotMatches).toHaveLength(2);
      // Lot 1: (90000 - 80000) * 0.5 = 5000
      expect(result.lotMatches[0].pnl).toBe(5000);
      // Lot 2: (90000 - 85000) * 0.3 = 1500
      expect(result.lotMatches[1].pnl).toBe(1500);
      // Total: 6500
      expect(result.realizedPnl).toBe(6500);
      expect(result.remainingLots).toHaveLength(0);
    });
  });

  describe("sellFIFO — Partial sells", () => {
    it("should split lot on partial sell", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.3, 85000, "2025-01-02T00:00:00Z");

      // Sell 0.3 of 0.8 total → should consume part of first lot
      const result = sellFIFO(state, 0.3, 90000);

      expect(result.lotMatches).toHaveLength(1);
      expect(result.lotMatches[0].matchedQuantity).toBe(0.3);
      expect(result.lotMatches[0].entryPrice).toBe(80000); // FIFO: oldest first
      expect(result.lotMatches[0].pnl).toBe(3000); // (90000 - 80000) * 0.3

      // Remaining: 0.2 @ 80000 + 0.3 @ 85000
      expect(result.remainingLots).toHaveLength(2);
      expect(result.remainingLots[0].quantity).toBe(0.2);
      expect(result.remainingLots[0].entryPrice).toBe(80000);
      expect(result.remainingLots[1].quantity).toBe(0.3);
      expect(result.remainingLots[1].entryPrice).toBe(85000);
    });

    it("should handle sequential partial sells correctly", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.3, 85000, "2025-01-02T00:00:00Z");

      // First sell: 0.3 at 90000
      const result1 = sellFIFO(state, 0.3, 90000);
      const state2 = { ...state, lots: result1.remainingLots };

      // Second sell: 0.3 at 95000
      const result2 = sellFIFO(state2, 0.3, 95000);

      // Second sell should consume remaining 0.2 @ 80000 + 0.1 @ 85000
      expect(result2.lotMatches).toHaveLength(2);
      expect(result2.lotMatches[0].matchedQuantity).toBe(0.2);
      expect(result2.lotMatches[0].entryPrice).toBe(80000);
      expect(result2.lotMatches[0].pnl).toBe(3000); // (95000 - 80000) * 0.2
      expect(result2.lotMatches[1].matchedQuantity).toBeCloseTo(0.1, 8);
      expect(result2.lotMatches[1].entryPrice).toBe(85000);
      expect(result2.lotMatches[1].pnl).toBe(1000); // (95000 - 85000) * 0.1

      // Remaining: 0.2 @ 85000
      expect(result2.remainingLots).toHaveLength(1);
      expect(result2.remainingLots[0].quantity).toBeCloseTo(0.2, 8);
      expect(result2.remainingLots[0].entryPrice).toBe(85000);
    });

    it("should match entire first lot then partial second lot", () => {
      let state = createLedger();
      state = addLot(state, 0.2, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.5, 85000, "2025-01-02T00:00:00Z");

      // Sell 0.4 → all of lot1 (0.2) + 0.2 from lot2
      const result = sellFIFO(state, 0.4, 90000);

      expect(result.lotMatches).toHaveLength(2);
      expect(result.lotMatches[0].matchedQuantity).toBe(0.2);
      expect(result.lotMatches[0].entryPrice).toBe(80000);
      expect(result.lotMatches[1].matchedQuantity).toBe(0.2);
      expect(result.lotMatches[1].entryPrice).toBe(85000);

      // Remaining: 0.3 @ 85000
      expect(result.remainingLots).toHaveLength(1);
      expect(result.remainingLots[0].quantity).toBeCloseTo(0.3, 8);
    });
  });

  describe("sellFIFO — Error handling", () => {
    it("should throw InsufficientQuantityError when selling more than owned", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000);

      expect(() => sellFIFO(state, 0.6, 90000)).toThrow(
        InsufficientQuantityError,
      );
    });

    it("should include available quantity in error", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000);

      try {
        sellFIFO(state, 1.0, 90000);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(InsufficientQuantityError);
        expect((err as InsufficientQuantityError).requested).toBe(1.0);
        expect((err as InsufficientQuantityError).available).toBe(0.5);
      }
    });

    it("should throw on empty ledger sell", () => {
      const state = createLedger();

      expect(() => sellFIFO(state, 0.1, 90000)).toThrow(
        InsufficientQuantityError,
      );
    });
  });

  describe("sellFIFO — Short positions", () => {
    it("should calculate P&L correctly for short positions", () => {
      let state = createLedger("short");
      state = addLot(state, 1.0, 90000);

      // Short position profit when price goes DOWN
      const result = sellFIFO(state, 1.0, 80000);

      expect(result.realizedPnl).toBe(10000); // (90000 - 80000) * 1.0
    });

    it("should calculate short position loss correctly", () => {
      let state = createLedger("short");
      state = addLot(state, 0.5, 80000);

      // Short position loss when price goes UP
      const result = sellFIFO(state, 0.5, 90000);

      expect(result.realizedPnl).toBe(-5000); // (80000 - 90000) * 0.5
    });
  });

  describe("Query functions", () => {
    it("getTotalQuantity with multiple lots", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000);
      state = addLot(state, 0.3, 85000);
      state = addLot(state, 0.2, 90000);

      expect(getTotalQuantity(state)).toBeCloseTo(1.0, 8);
    });

    it("getWeightedEntryPrice", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000);
      state = addLot(state, 0.3, 85000);

      // Weighted avg: (0.5 * 80000 + 0.3 * 85000) / (0.5 + 0.3)
      // = (40000 + 25500) / 0.8 = 65500 / 0.8 = 81875
      expect(getWeightedEntryPrice(state)).toBeCloseTo(81875, 2);
    });

    it("getWeightedEntryPrice returns 0 for empty ledger", () => {
      expect(getWeightedEntryPrice(createLedger())).toBe(0);
    });

    it("getUnrealizedPnl for long position", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000);
      state = addLot(state, 0.3, 85000);

      // Current price: 90000
      // Lot 1: (90000 - 80000) * 0.5 = 5000
      // Lot 2: (90000 - 85000) * 0.3 = 1500
      // Total: 6500
      expect(getUnrealizedPnl(state, 90000)).toBe(6500);
    });

    it("getUnrealizedPnl for loss scenario", () => {
      let state = createLedger();
      state = addLot(state, 1.0, 90000);

      // Price dropped to 80000
      expect(getUnrealizedPnl(state, 80000)).toBe(-10000);
    });

    it("getUnrealizedPnlPct", () => {
      let state = createLedger();
      state = addLot(state, 1.0, 80000);

      // Current price: 88000 → 10% gain
      expect(getUnrealizedPnlPct(state, 88000)).toBe(10);
    });

    it("isEmpty should be true for empty ledger", () => {
      expect(isEmpty(createLedger())).toBe(true);
    });

    it("isEmpty should be false for non-empty ledger", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000);
      expect(isEmpty(state)).toBe(false);
    });
  });

  describe("Migration", () => {
    it("should migrate legacy position to single lot", () => {
      const legacy = {
        side: "long" as const,
        quantity: 0.5,
        entry_price: 80000,
        entry_time: "2025-01-01T00:00:00Z",
      };

      const state = migrateFromLegacy(legacy);

      expect(state.side).toBe("long");
      expect(state.lots).toHaveLength(1);
      expect(state.lots[0].quantity).toBe(0.5);
      expect(state.lots[0].entryPrice).toBe(80000);
      expect(state.lots[0].timestamp).toBe("2025-01-01T00:00:00Z");
    });

    it("should handle zero-quantity legacy position", () => {
      const legacy = {
        side: "long" as const,
        quantity: 0,
        entry_price: 80000,
        entry_time: "2025-01-01T00:00:00Z",
      };

      const state = migrateFromLegacy(legacy);
      expect(state.lots).toHaveLength(0);
    });

    it("toLegacyPosition should convert back to legacy format", () => {
      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.3, 85000, "2025-01-02T00:00:00Z");

      const legacy = toLegacyPosition(state);

      expect(legacy).not.toBeNull();
      expect(legacy!.quantity).toBeCloseTo(0.8, 8);
      expect(legacy!.entry_price).toBeCloseTo(81875, 2); // weighted avg
      expect(legacy!.side).toBe("long");
      // Earliest timestamp
      expect(legacy!.entry_time).toBe("2025-01-01T00:00:00Z");
      expect(legacy!.lots).toHaveLength(2);
    });

    it("toLegacyPosition should return null for empty ledger", () => {
      expect(toLegacyPosition(createLedger())).toBeNull();
    });
  });

  describe("Rounding precision", () => {
    it("should handle crypto-precision quantities (8 decimals)", () => {
      let state = createLedger();
      state = addLot(state, 0.00012345, 80000);
      state = addLot(state, 0.00056789, 85000);

      const total = getTotalQuantity(state);
      expect(total).toBeCloseTo(0.00069134, 8);
    });

    it("should not accumulate floating point errors on partial sells", () => {
      let state = createLedger();
      // Add 3 lots of 0.1 each
      for (let i = 0; i < 3; i++) {
        state = addLot(state, 0.1, 80000 + i * 1000);
      }

      // Sell 0.1 three times
      for (let i = 0; i < 3; i++) {
        const result = sellFIFO(state, 0.1, 90000);
        state = { ...state, lots: result.remainingLots };
      }

      expect(getTotalQuantity(state)).toBeCloseTo(0, 8);
      expect(isEmpty(state)).toBe(true);
    });
  });

  describe("Real-world scenario: BTC multi-buy + partial sell", () => {
    it("should correctly calculate FIFO P&L for the original bug scenario", () => {
      // Scenario from the ticket:
      // Buy 0.5 BTC @ $80,000
      // Buy 0.3 BTC @ $85,000
      // Sell 0.5 BTC @ $90,000

      let state = createLedger();
      state = addLot(state, 0.5, 80000, "2025-01-01T00:00:00Z");
      state = addLot(state, 0.3, 85000, "2025-01-02T00:00:00Z");

      // Sell 0.5 BTC at $90,000
      const result = sellFIFO(state, 0.5, 90000);

      // FIFO: matches entirely against first lot (0.5 @ 80000)
      expect(result.lotMatches).toHaveLength(1);
      expect(result.lotMatches[0].matchedQuantity).toBe(0.5);
      expect(result.lotMatches[0].entryPrice).toBe(80000);
      expect(result.realizedPnl).toBe(5000); // (90000 - 80000) * 0.5

      // BUG FIX VERIFICATION:
      // Old buggy code used weighted avg entry: (0.5*80000 + 0.3*85000) / 0.8 = 81875
      // Old P&L would be: (90000 - 81875) * 0.5 = $4062.50 ← WRONG
      // FIFO P&L is: (90000 - 80000) * 0.5 = $5000 ← CORRECT

      // Remaining: 0.3 @ 85000
      expect(result.remainingLots).toHaveLength(1);
      expect(result.remainingLots[0].quantity).toBe(0.3);
      expect(result.remainingLots[0].entryPrice).toBe(85000);
      expect(result.avgEntryPrice).toBe(85000);
    });
  });
});
