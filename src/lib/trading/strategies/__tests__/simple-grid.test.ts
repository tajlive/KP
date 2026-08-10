/**
 * SimpleGridStrategy — COMBO (grid ±1.5 % + DCA hver 4. time).
 * Mega-plan Oppgave 2.1. Pilot-strategien: mekanisk, deterministisk, mormor-forklarbar.
 *
 * Tilstandsløs design: anker = median av siste N closes, fylte nivåer
 * avledes fra session.open_position.lots (FIFO-ledgeren i tick vedlikeholder dem).
 * Ingen tick-endringer nødvendig.
 */
import { describe, it, expect } from "vitest";
import { SimpleGridStrategy, SIMPLE_GRID_DEFAULTS } from "../simple-grid";
import type { MinimalSession, StrategyInput, Candle, StrategyPosition } from "../types";

function candle(close: number, time = 0): Candle {
  return { time, open: close, high: close, low: close, close, volume: 1000 };
}

function candlesAv(priser: number[]): Candle[] {
  return priser.map((p, i) => candle(p, i * 300_000)); // 5-min intervaller
}

function sessionMed(opts: {
  lots?: StrategyPosition["lots"];
  capital?: number;
  config?: Record<string, unknown>;
}): MinimalSession {
  return {
    open_position: opts.lots && opts.lots.length > 0
      ? {
          side: "long",
          quantity: opts.lots.reduce((s, l) => s + l.quantity, 0),
          entry_price: opts.lots[0].entryPrice,
          entry_time: opts.lots[0].timestamp,
          lots: opts.lots,
        }
      : null,
    last_tick_at: null,
    strategy_config: {},
    ...(opts.capital !== undefined
      ? ({ current_capital_nok: opts.capital } as object)
      : {}),
  } as MinimalSession;
}

const NÅ = 1_800_000_000_000; // fast tidspunkt for deterministiske tester

function input(
  candles: Candle[],
  session: MinimalSession,
  config: Record<string, unknown> = {},
): StrategyInput {
  return { candles, session, config, currentTime: NÅ };
}

describe("SimpleGridStrategy — COMBO", () => {
  const strat = new SimpleGridStrategy();

  it("tomme candles → hold, ingen krasj", () => {
    const sig = strat.evaluate(input([], sessionMed({})));
    expect(sig.action).toBe("hold");
  });

  it("ny sesjon uten posisjon → DCA startkjøp (2 % av kapital)", () => {
    const sig = strat.evaluate(
      input(candlesAv(Array(50).fill(100)), sessionMed({ capital: 100000 })),
    );
    expect(sig.action).toBe("buy");
    expect(sig.positionSize).toBeCloseTo(SIMPLE_GRID_DEFAULTS.dca_amount_pct, 5);
    expect(sig.reason).toBeTruthy();
  });

  it("pris 3 % under anker (nivå 2) uten lots → grid-kjøp 5 %", () => {
    // Anker ≈ 100, pris faller til 97 → treffer nivå 2 (100 * 0.97)
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const sig = strat.evaluate(input(candles, sessionMed({ capital: 100000 })));
    expect(sig.action).toBe("buy");
    expect(sig.positionSize).toBeCloseTo(SIMPLE_GRID_DEFAULTS.grid_amount_pct, 5);
    expect(sig.indicators?.grid_level).toBeGreaterThanOrEqual(1);
  });

  it("lot på samme nivå (innen toleranse) → ingen dobbel-fyll", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const session = sessionMed({
      capital: 100000,
      lots: [{
        id: "l1", quantity: 1, entryPrice: 97.1,
        timestamp: new Date(NÅ - 3600_000).toISOString(), // 1t siden — for fersk for DCA
        originalQuantity: 1,
      }],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("hold");
  });

  it("lot med gevinst ≥ 1.5 % → selg lot-kvantum, exitReason take_profit", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(102)];
    const session = sessionMed({
      capital: 100000,
      lots: [{
        id: "l1", quantity: 0.5, entryPrice: 100,
        timestamp: new Date(NÅ - 7200_000).toISOString(),
        originalQuantity: 0.5,
      }],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
    expect(sig.quantity).toBe(0.5);
    expect(sig.exitReason).toBe("take_profit");
  });

  it("lot UTEN gevinst ennå (pris +1 %) → ikke selg", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(101)];
    const session = sessionMed({
      capital: 100000,
      lots: [{
        id: "l1", quantity: 0.5, entryPrice: 100.4, // pris 101 < 100.4*1.015=101.9
        timestamp: new Date(NÅ - 1800_000).toISOString(),
        originalQuantity: 0.5,
      }],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).not.toBe("sell");
  });

  it("ingen grid-treff + siste kjøp 5t siden → DCA-kjøp", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(100)];
    const session = sessionMed({
      capital: 100000,
      lots: [{
        id: "l1", quantity: 1, entryPrice: 100,
        timestamp: new Date(NÅ - 5 * 3600_000).toISOString(), // 5t siden
        originalQuantity: 1,
      }],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("buy");
    expect(sig.positionSize).toBeCloseTo(SIMPLE_GRID_DEFAULTS.dca_amount_pct, 5);
    expect(sig.indicators?.dca).toBe(true);
  });

  it("siste kjøp 1t siden og ingen treff → hold", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(100)];
    const session = sessionMed({
      capital: 100000,
      lots: [{
        id: "l1", quantity: 1, entryPrice: 100,
        timestamp: new Date(NÅ - 3600_000).toISOString(),
        originalQuantity: 1,
      }],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("hold");
  });

  it("salg har prioritet over kjøp i samme tick", () => {
    // Pris 102 (lot kan selges) men anker faller slik at et nivå også treffes
    const candles = [...candlesAv(Array(47).fill(103)), candle(101.5), candle(102)];
    const session = sessionMed({
      capital: 100000,
      lots: [{
        id: "l1", quantity: 0.3, entryPrice: 100.3,
        timestamp: new Date(NÅ - 3600_000).toISOString(),
        originalQuantity: 0.3,
      }],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
  });
});

describe("Grid-pause under hele rutenettet (kanonisk range-exit)", () => {
  const strat = new SimpleGridStrategy();

  function lagSessionMedLot(timerSiden: number) {
    return {
      open_position: {
        side: "long" as const,
        quantity: 1,
        entry_price: 100,
        entry_time: new Date(NÅ - timerSiden * 3600_000).toISOString(),
        lots: [{
          id: "l1", quantity: 1, entryPrice: 100,
          timestamp: new Date(NÅ - timerSiden * 3600_000).toISOString(),
          originalQuantity: 1,
        }],
      },
      last_tick_at: null,
      strategy_config: {},
      current_capital_nok: 90000,
    } as unknown as MinimalSession;
  }

  it("pris under hele gridet → hold (ingen DCA selv om den er overstadig)", () => {
    // Anker 100, grid-bunn 92.5. Pris 90 < 92.5 → pause selv om siste kjøp er 10t siden
    const candles = [...candlesAv(Array(48).fill(100)), candle(90)];
    const sig = strat.evaluate(input(candles, lagSessionMedLot(10)));
    expect(sig.action).toBe("hold");
    expect(sig.indicators?.paused_below_grid).toBe(true);
  });

  it("pris tilbake innenfor gridet → normal oppførsel gjenopptas", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(96)];
    const sig = strat.evaluate(input(candles, lagSessionMedLot(1)));
    expect(sig.indicators?.paused_below_grid).toBeUndefined();
  });
});

describe("Drawdown-gate (krasj-pause)", () => {
  const strat = new SimpleGridStrategy();

  it("pris >20 % under 30-dagers topp → ingen kjøp", () => {
    // 720 candles: topp 130, siste 48 faller til 95 (>20 % under topp)
    const candles = [...candlesAv(Array(672).fill(130)), ...candlesAv(Array(48).fill(95))];
    const sig = strat.evaluate(input(candles, lagSession({})));
    expect(sig.action).toBe("hold");
    expect(sig.indicators?.regime).toBe("drawdown_paused");
  });

  it("pris innen 20 % av toppen → gate åpen", () => {
    const candles = [...candlesAv(Array(672).fill(130)), ...candlesAv(Array(48).fill(120))];
    const sig = strat.evaluate(input(candles, lagSession({})));
    expect(sig.indicators?.regime).not.toBe("drawdown_paused");
  });
});

function lagSession({ timerSiden = 10 }: { timerSiden?: number }) {
  return {
    open_position: {
      side: "long" as const,
      quantity: 1,
      entry_price: 100,
      entry_time: new Date(NÅ - timerSiden * 3600_000).toISOString(),
      lots: [{
        id: "l1", quantity: 1, entryPrice: 100,
        timestamp: new Date(NÅ - timerSiden * 3600_000).toISOString(),
        originalQuantity: 1,
      }],
    },
    last_tick_at: null,
    strategy_config: {},
    current_capital_nok: 90000,
  } as unknown as MinimalSession;
}
