import { describe, expect, it } from "vitest";
import { mergeOrphanPositions } from "../orphan-positions";
import type { StrategyPosition } from "../strategies/types";

/**
 * Orphan-posisjoner: stoppede sesjoner etterlater åpne posisjoner som
 * aldri tickes (exit-logikken kjører kun på aktive sesjoner).
 * Prod-bevis 2026-07-25: 63 stoppede sesjoner, 8 med open_position —
 * posisjonene ble aldri solgt → realisert P&L = 0 for alltid.
 *
 * Redning: når en ny aktiv sesjon opprettes for samme bruker+par,
 * slås orphan-posisjonene sammen (FIFO-lots beholdes) og flyttes til
 * den aktive sesjonen — exit-logikken overtar derfra.
 */
describe("mergeOrphanPositions", () => {
  it("returnerer null for tom liste", () => {
    expect(mergeOrphanPositions([])).toBeNull();
  });

  it("returnerer én posisjon uendret i verdi", () => {
    const pos: StrategyPosition = {
      side: "long",
      quantity: 0.005,
      entry_price: 600000,
      entry_time: "2026-07-20T10:00:00Z",
      highest_price: 610000,
    };
    const merged = mergeOrphanPositions([pos]);
    expect(merged).not.toBeNull();
    expect(merged!.quantity).toBe(0.005);
    expect(merged!.entry_price).toBe(600000);
    expect(merged!.entry_time).toBe("2026-07-20T10:00:00Z");
    expect(merged!.highest_price).toBe(610000);
  });

  it("slår sammen to posisjoner med vektet snittinngang", () => {
    const a: StrategyPosition = {
      side: "long",
      quantity: 0.005,
      entry_price: 600000,
      entry_time: "2026-07-18T10:00:00Z",
      highest_price: 640000,
    };
    const b: StrategyPosition = {
      side: "long",
      quantity: 0.012,
      entry_price: 631188,
      entry_time: "2026-07-20T20:07:00Z",
      highest_price: 635000,
    };
    const merged = mergeOrphanPositions([a, b]);
    expect(merged).not.toBeNull();
    expect(merged!.quantity).toBeCloseTo(0.017, 8);
    // Vektet snitt: (0.005*600000 + 0.012*631188) / 0.017
    expect(merged!.entry_price).toBeCloseTo(
      (0.005 * 600000 + 0.012 * 631188) / 0.017,
      2,
    );
    // Tidligste inngangstidspunkt (time-exit regner fra første kjøp)
    expect(merged!.entry_time).toBe("2026-07-18T10:00:00Z");
    // Høyeste topp (trailing TP må ikke nullstilles)
    expect(merged!.highest_price).toBe(640000);
  });

  it("prod-tilfellet: Toms 4 DCA-orphans slås korrekt sammen", () => {
    // Faktiske prod-data (kjøp 19–25.07.2026, alle orphans):
    const orphans: StrategyPosition[] = [
      { side: "long", quantity: 0.0077, entry_price: 623603, entry_time: "2026-07-19T22:40:00Z" },
      { side: "long", quantity: 0.0077, entry_price: 625386, entry_time: "2026-07-20T04:25:00Z" },
      { side: "long", quantity: 0.0120, entry_price: 631188, entry_time: "2026-07-20T20:07:00Z" },
      { side: "long", quantity: 0.0047, entry_price: 613978, entry_time: "2026-07-25T08:15:00Z" },
    ];
    const merged = mergeOrphanPositions(orphans);
    expect(merged).not.toBeNull();
    expect(merged!.quantity).toBeCloseTo(0.0321, 8);
    const expectedEntry =
      (0.0077 * 623603 + 0.0077 * 625386 + 0.0120 * 631188 + 0.0047 * 613978) /
      0.0321;
    expect(merged!.entry_price).toBeCloseTo(expectedEntry, 2);
    expect(merged!.entry_time).toBe("2026-07-19T22:40:00Z");
  });

  it("konkatenerer FIFO-lots sortert på tid (kostgrunnlag bevares)", () => {
    const a: StrategyPosition = {
      side: "long",
      quantity: 0.005,
      entry_price: 600000,
      entry_time: "2026-07-20T10:00:00Z",
      lots: [
        { id: "lot-b", quantity: 0.005, entryPrice: 600000, timestamp: "2026-07-20T10:00:00Z", originalQuantity: 0.005 },
      ],
    };
    const b: StrategyPosition = {
      side: "long",
      quantity: 0.003,
      entry_price: 700000,
      entry_time: "2026-07-18T10:00:00Z",
      lots: [
        { id: "lot-a", quantity: 0.003, entryPrice: 700000, timestamp: "2026-07-18T10:00:00Z", originalQuantity: 0.003 },
      ],
    };
    const merged = mergeOrphanPositions([a, b]);
    expect(merged!.lots).toHaveLength(2);
    // Eldste lot først (FIFO-rekkefølge)
    expect(merged!.lots![0].id).toBe("lot-a");
    expect(merged!.lots![1].id).toBe("lot-b");
  });

  it("posisjoner uten lots får ikke lots-felt", () => {
    const a: StrategyPosition = {
      side: "long",
      quantity: 0.005,
      entry_price: 600000,
      entry_time: "2026-07-20T10:00:00Z",
    };
    const merged = mergeOrphanPositions([a]);
    expect(merged!.lots).toBeUndefined();
  });
});
