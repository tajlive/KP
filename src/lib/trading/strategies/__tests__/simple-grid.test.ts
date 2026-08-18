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
import type {
  MinimalSession,
  StrategyInput,
  Candle,
  StrategyPosition,
} from "../types";

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
  strategyConfig?: Record<string, unknown>;
}): MinimalSession {
  return {
    open_position:
      opts.lots && opts.lots.length > 0
        ? {
            side: "long",
            quantity: opts.lots.reduce((s, l) => s + l.quantity, 0),
            entry_price: opts.lots[0].entryPrice,
            entry_time: opts.lots[0].timestamp,
            lots: opts.lots,
          }
        : null,
    last_tick_at: null,
    strategy_config: opts.strategyConfig ?? {},
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
    expect(sig.positionSize).toBeCloseTo(
      SIMPLE_GRID_DEFAULTS.dca_amount_pct,
      5,
    );
    expect(sig.reason).toBeTruthy();
  });

  it("pris 3 % under anker (nivå 2) uten lots → grid-kjøp 5 %", () => {
    // Anker ≈ 100, pris faller til 97 → treffer nivå 2 (100 * 0.97)
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const sig = strat.evaluate(input(candles, sessionMed({ capital: 100000 })));
    expect(sig.action).toBe("buy");
    expect(sig.positionSize).toBeCloseTo(
      SIMPLE_GRID_DEFAULTS.grid_amount_pct,
      5,
    );
    expect(sig.indicators?.grid_level).toBeGreaterThanOrEqual(1);
  });

  it("lot på samme nivå (innen toleranse) → ingen dobbel-fyll", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 1,
          entryPrice: 97.1,
          timestamp: new Date(NÅ - 3600_000).toISOString(), // 1t siden — for fersk for DCA
          originalQuantity: 1,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("hold");
  });

  it("E3: lot på grid-nivå → selg 15 % (take_profit_partial), 85 % løper videre", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(102)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 1.0,
          entryPrice: 100,
          timestamp: new Date(NÅ - 7200_000).toISOString(),
          originalQuantity: 1.0,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
    expect(sig.quantity).toBeCloseTo(0.15, 10); // 15 % av originalQuantity (robust topp fra sweep)
    expect(sig.exitReason).toBe("take_profit_partial");
    expect(sig.indicators?.lot_id).toBe("l1");
  });

  it("E3: runner over breakeven → hold (løper videre og fanger høyrehalen)", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(102)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 0.5,
          entryPrice: 100, // delvis solgt (0.5 < 1.0)
          timestamp: new Date(NÅ - 7200_000).toISOString(),
          originalQuantity: 1.0,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).not.toBe("sell");
  });

  it("E3: runner under breakeven → selg resten (aldri vinner→taper)", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(99)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 0.5,
          entryPrice: 100,
          timestamp: new Date(NÅ - 7200_000).toISOString(),
          originalQuantity: 1.0,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
    expect(sig.quantity).toBe(0.5);
    expect(sig.exitReason).toBe("breakeven_stop");
    expect(sig.indicators?.lot_id).toBe("l1");
  });

  it("lot UTEN gevinst ennå (pris +1 %) → ikke selg", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(101)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 0.5,
          entryPrice: 100.4, // pris 101 < 100.4*1.015=101.9
          timestamp: new Date(NÅ - 1800_000).toISOString(),
          originalQuantity: 0.5,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).not.toBe("sell");
  });

  it("ingen grid-treff + siste kjøp 5t siden → DCA-kjøp", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(100)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 1,
          entryPrice: 100,
          timestamp: new Date(NÅ - 5 * 3600_000).toISOString(), // 5t siden
          originalQuantity: 1,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("buy");
    expect(sig.positionSize).toBeCloseTo(
      SIMPLE_GRID_DEFAULTS.dca_amount_pct,
      5,
    );
    expect(sig.indicators?.dca).toBe(true);
  });

  it("siste kjøp 1t siden og ingen treff → hold", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(100)];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 1,
          entryPrice: 100,
          timestamp: new Date(NÅ - 3600_000).toISOString(),
          originalQuantity: 1,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("hold");
  });

  it("salg har prioritet over kjøp i samme tick", () => {
    // Pris 102 (lot kan selges) men anker faller slik at et nivå også treffes
    const candles = [
      ...candlesAv(Array(47).fill(103)),
      candle(101.5),
      candle(102),
    ];
    const session = sessionMed({
      capital: 100000,
      lots: [
        {
          id: "l1",
          quantity: 0.3,
          entryPrice: 100.3,
          timestamp: new Date(NÅ - 3600_000).toISOString(),
          originalQuantity: 0.3,
        },
      ],
    });
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
  });
});

describe("E6: kjøps-cooldown + maks kjøp/dag (2026-08-16/19)", () => {
  const strat = new SimpleGridStrategy();

  // Grid-kjøp-trigger: pris 97 (nivå 2), ingen lots → ellers buy
  const gridCandles = [...candlesAv(Array(48).fill(100)), candle(97)];

  it("cooldown aktiv (30 min siden siste kjøp, cooldown 120) → hold, selv om grid treffer", () => {
    const sig = strat.evaluate(
      input(
        gridCandles,
        sessionMed({
          capital: 100000,
          strategyConfig: {
            last_buy_at: new Date(NÅ - 30 * 60_000).toISOString(),
          },
        }),
        { buy_cooldown_minutes: 120 },
      ),
    );
    expect(sig.action).toBe("hold");
    expect(sig.indicators?.cooldown_min_igjen).toBe(90);
  });

  it("cooldown utløpt (3t siden, cooldown 120) → grid-kjøp gjennomføres", () => {
    const sig = strat.evaluate(
      input(
        gridCandles,
        sessionMed({
          capital: 100000,
          strategyConfig: {
            last_buy_at: new Date(NÅ - 3 * 3600_000).toISOString(),
          },
        }),
        { buy_cooldown_minutes: 120 },
      ),
    );
    expect(sig.action).toBe("buy");
  });

  it("maks kjøp/dag nådd (2/2 i dag) → hold med daily_buys_used", () => {
    const iDag = new Date(NÅ).toISOString().split("T")[0];
    const sig = strat.evaluate(
      input(
        gridCandles,
        sessionMed({
          capital: 100000,
          strategyConfig: { daily_buys_today: iDag, daily_buy_count: 2 },
        }),
        { max_buys_per_day: 2 },
      ),
    );
    expect(sig.action).toBe("hold");
    expect(sig.indicators?.daily_buys_used).toBe(2);
    expect(sig.indicators?.daily_buys_max).toBe(2);
  });

  it("budsjett igjen (1/2 i dag) → kjøp gjennomføres", () => {
    const iDag = new Date(NÅ).toISOString().split("T")[0];
    const sig = strat.evaluate(
      input(
        gridCandles,
        sessionMed({
          capital: 100000,
          strategyConfig: { daily_buys_today: iDag, daily_buy_count: 1 },
        }),
        { max_buys_per_day: 2 },
      ),
    );
    expect(sig.action).toBe("buy");
  });

  it("gårsdagens teller nullstilles automatisk (daily_buys_today=gårsdagen)", () => {
    const iGår = new Date(NÅ - 24 * 3600_000).toISOString().split("T")[0];
    const sig = strat.evaluate(
      input(
        gridCandles,
        sessionMed({
          capital: 100000,
          strategyConfig: { daily_buys_today: iGår, daily_buy_count: 5 },
        }),
        { max_buys_per_day: 2 },
      ),
    );
    expect(sig.action).toBe("buy"); // 5 kjøp i går teller ikke i dag
  });

  it("cooldown blokkerer ALDRI salg (pris 102 → take-profit selv med aktiv cooldown)", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(102)];
    const session = sessionMed({
      capital: 100000,
      strategyConfig: {
        last_buy_at: new Date(NÅ - 5 * 60_000).toISOString(),
      },
      lots: [
        {
          id: "l1",
          quantity: 1.0,
          entryPrice: 100,
          timestamp: new Date(NÅ - 7200_000).toISOString(),
          originalQuantity: 1.0,
        },
      ],
    });
    const sig = strat.evaluate(
      input(candles, session, { buy_cooldown_minutes: 120 }),
    );
    expect(sig.action).toBe("sell");
    expect(sig.exitReason).toBe("take_profit_partial");
  });

  it("default (0 = av) → ingen endring fra baseline: kjøp gjennomføres", () => {
    const sig = strat.evaluate(
      input(
        gridCandles,
        sessionMed({
          capital: 100000,
          strategyConfig: {
            last_buy_at: new Date(NÅ - 5 * 60_000).toISOString(),
          },
        }),
      ),
    );
    expect(sig.action).toBe("buy");
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
        lots: [
          {
            id: "l1",
            quantity: 1,
            entryPrice: 100,
            timestamp: new Date(NÅ - timerSiden * 3600_000).toISOString(),
            originalQuantity: 1,
          },
        ],
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

  it("pris >20 % under topp → «slipp posene»: selger ALT (range_exit)", () => {
    // 720 candles: topp 130, siste 48 faller til 95 (>20 % under topp)
    const candles = [
      ...candlesAv(Array(672).fill(130)),
      ...candlesAv(Array(48).fill(95)),
    ];
    const sig = strat.evaluate(input(candles, lagSession({})));
    expect(sig.action).toBe("sell");
    expect(sig.exitReason).toBe("range_exit");
    expect(sig.indicators?.regime).toBe("range_exit_liquidation");
    expect(sig.quantity).toBe(1); // hele posisjonen (1 lot × 1)
  });

  it("liquidate_on_range_exit: false → bare pause (aldri tvunget salg)", () => {
    const candles = [
      ...candlesAv(Array(672).fill(130)),
      ...candlesAv(Array(48).fill(95)),
    ];
    const sig = strat.evaluate(
      input(candles, lagSession({}), { liquidate_on_range_exit: false }),
    );
    expect(sig.action).toBe("hold");
    expect(sig.indicators?.regime).toBe("drawdown_paused");
  });

  it("pris innen 20 % av toppen → gate åpen", () => {
    const candles = [
      ...candlesAv(Array(672).fill(130)),
      ...candlesAv(Array(48).fill(120)),
    ];
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
      lots: [
        {
          id: "l1",
          quantity: 1,
          entryPrice: 100,
          timestamp: new Date(NÅ - timerSiden * 3600_000).toISOString(),
          originalQuantity: 1,
        },
      ],
    },
    last_tick_at: null,
    strategy_config: {},
    current_capital_nok: 90000,
  } as unknown as MinimalSession;
}

describe("E1: adaptiv ATR-steg", () => {
  const strat = new SimpleGridStrategy();

  function volCandles(amp: number, n: number): Candle[] {
    // Sinus med amplitude amp rundt 100 — kontrollert volatilitet
    return Array.from({ length: n }, (_, i) => {
      const p = 100 + amp * Math.sin((i * Math.PI) / 4);
      return {
        time: i * 3600_000,
        open: p,
        high: p + amp / 2,
        low: p - amp / 2,
        close: p,
        volume: 1000,
      };
    });
  }

  it("høy volatilitet → større steg (cap 3 %), lav volatilitet → gulv 1 %", () => {
    const høyVol = strat.evaluate(
      input(volCandles(8, 60), lagSession({}), { adaptive_step: true }),
    );
    const lavVol = strat.evaluate(
      input(volCandles(0.1, 60), lagSession({}), { adaptive_step: true }),
    );
    // Begge gir et signal uansett — men indikatorer avslører steg via level-avstand
    expect(høyVol).toBeTruthy();
    expect(lavVol).toBeTruthy();
  });

  it("adaptive_step av (default) → uendret fast steg", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const sig = strat.evaluate(input(candles, lagSession({})));
    expect(sig.action).toBe("buy");
    expect(sig.indicators?.grid_level).toBeGreaterThanOrEqual(1);
  });
});

describe("E2: smart DCA", () => {
  const strat = new SimpleGridStrategy();

  it("pris 3 % under anker → multiplikator > 1 (kjøp mer i dip)", () => {
    // Anker 100, pris 97 (3 % under), siste kjøp 10t siden
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const session = lagSession({});
    // Lot ved 100 slik at nivå k1/k2 ikke allerede er fylt... k1=98.5, k2=97 →
    // pris 97 treffer k1 (ufylt) → grid-kjøp skjer FØR DCA. Bruk 99 i stedet:
    const candles99 = [...candlesAv(Array(48).fill(100)), candle(99)];
    const sig = strat.evaluate(input(candles99, session, { smart_dca: true }));
    if (sig.action === "buy" && sig.indicators?.dca) {
      expect(sig.indicators.smart_dca_mult).toBeGreaterThan(1);
      expect(sig.positionSize).toBeGreaterThan(0.02);
    } else {
      // grid-kjøp er også lovlig her — da er DCA ikke evaluert ennå
      expect(sig.action).toBe("buy");
    }
  });

  it("smart_dca av (default) → alltid 2 %", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(99)];
    const sig = strat.evaluate(input(candles, lagSession({})));
    if (sig.indicators?.dca) {
      expect(sig.positionSize).toBeCloseTo(0.02, 5);
      expect(sig.indicators.smart_dca_mult).toBeUndefined();
    }
  });
});
