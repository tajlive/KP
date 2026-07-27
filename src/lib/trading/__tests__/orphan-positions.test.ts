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

/**
 * Verifisert adopsjon (inflasjonsfiks 2026-07-27): korrupte orphans droppes,
 * NOK-denominerte normaliseres til USDT før de flyttes til aktiv sesjon.
 */
describe("adoptOrphanPositions", () => {
   
  function makeDb(orphans: any[], currentPosition: unknown) {
    const updates: Array<{ payload: Record<string, unknown>; ids?: string[] }> = [];
    const logInserts: Array<Record<string, unknown>> = [];
     
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: orphans, error: null }),
      single: vi.fn().mockResolvedValue({ data: { open_position: currentPosition }, error: null }),
      insert: vi.fn((payload: Record<string, unknown>) => {
        logInserts.push(payload);
        return Promise.resolve({ error: null });
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        const entry: { payload: Record<string, unknown>; ids?: string[] } = { payload };
        updates.push(entry);
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
          in: vi.fn((col: string, ids: string[]) => {
            entry.ids = ids;
            return Promise.resolve({ error: null });
          }),
        };
      }),
    };
    const db = { from: vi.fn(() => chain) };
    return { db, chain, updates, logInserts };
  }

  const activeSession = { id: "active-1", user_id: "user-1", trading_pair: "BTCUSDT" };
  const market = { currentPriceUsdt: 64429, usdtNokRate: 9.6 };

  // Adopsjons-UPDATE har shape { open_position: finalPosition } — finn den.
   
  function findAdoptUpdate(updates: Array<{ payload: any }>) {
    return updates.find(
      (u) =>
        u.payload?.open_position &&
        typeof u.payload.open_position === "object" &&
        "quantity" in u.payload.open_position,
    );
  }

  it("NOK-denominert orphan normaliseres til USDT ved adopsjon", async () => {
    const orphans = [
      {
        id: "orphan-1",
        trading_pair: "BTCUSDT",
        open_position: {
          side: "long",
          quantity: 0.0321,
          entry_price: 618900, // NOK → ~64 469 USDT
          entry_time: "2026-07-19T22:40:00Z",
          highest_price: 624080,
        },
      },
    ];
    const { db, updates } = makeDb(orphans, null);
    const { adoptOrphanPositions } = await import("../orphan-positions");

    const result = await adoptOrphanPositions(db as never, activeSession, market);

    expect(result.adopted).toBe(1);
    expect(result.dropped).toBe(0);
    const adoptUpdate = findAdoptUpdate(updates);
    expect(adoptUpdate).toBeDefined();
    const pos = adoptUpdate!.payload.open_position as { entry_price: number; highest_price: number };
    expect(pos.entry_price).toBeCloseTo(618900 / 9.6, 1);
    expect(pos.highest_price).toBeCloseTo(624080 / 9.6, 1);
  });

  it("KORRUPT orphan (entry 4,5k vs marked 64,5k) droppes og nullstilles", async () => {
    const orphans = [
      {
        id: "orphan-corrupt",
        trading_pair: "BTCUSDT",
        open_position: {
          side: "long",
          quantity: 0.5,
          entry_price: 4492,
          entry_time: "2026-07-01T10:00:00Z",
          highest_price: 196801,
        },
      },
    ];
    const { db, updates, logInserts } = makeDb(orphans, null);
    const { adoptOrphanPositions } = await import("../orphan-positions");

    const result = await adoptOrphanPositions(db as never, activeSession, market);

    expect(result.adopted).toBe(0);
    expect(result.dropped).toBe(1);
    // Aktiv sesjon skal IKKE oppdateres med en posisjon
    const adoptUpdate = findAdoptUpdate(updates);
    expect(adoptUpdate).toBeUndefined();
    // Orphan nullstilles
    const nullUpdate = updates.find((u) => u.payload.open_position === null);
    expect(nullUpdate).toBeDefined();
    expect(nullUpdate!.ids).toContain("orphan-corrupt");
    // Audit-logges
    expect(logInserts.some((p) => p.action === "orphan_dropped_corrupt")).toBe(true);
  });

  it("USDT-denominert orphan adopteres uendret", async () => {
    const orphans = [
      {
        id: "orphan-usdt",
        trading_pair: "BTCUSDT",
        open_position: {
          side: "long",
          quantity: 0.01,
          entry_price: 62000,
          entry_time: "2026-07-25T10:00:00Z",
        },
      },
    ];
    const { db, updates } = makeDb(orphans, null);
    const { adoptOrphanPositions } = await import("../orphan-positions");

    const result = await adoptOrphanPositions(db as never, activeSession, market);

    expect(result.adopted).toBe(1);
    const adoptUpdate = findAdoptUpdate(updates);
    const pos = adoptUpdate!.payload.open_position as { entry_price: number };
    expect(pos.entry_price).toBe(62000);
  });

  it("uten markedscontext beholdes legacy-oppførsel (ingen validering)", async () => {
    const orphans = [
      {
        id: "orphan-legacy",
        trading_pair: "BTCUSDT",
        open_position: {
          side: "long",
          quantity: 0.5,
          entry_price: 4492,
          entry_time: "2026-07-01T10:00:00Z",
        },
      },
    ];
    const { db, updates } = makeDb(orphans, null);
    const { adoptOrphanPositions } = await import("../orphan-positions");

    const result = await adoptOrphanPositions(db as never, activeSession);

    expect(result.adopted).toBe(1);
    expect(result.dropped).toBe(0);
    const adoptUpdate = findAdoptUpdate(updates);
    expect(adoptUpdate).toBeDefined();
  });
});
