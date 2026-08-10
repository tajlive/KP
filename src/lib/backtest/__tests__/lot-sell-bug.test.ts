/**
 * REGRESJONSTEST 2026-08-10 (funnet av Tom + bekreftet ved kodegjennomgang):
 * Strategien velger den PROFITABLE loten å selge, men simulatoren solgte
 * eldste lot FIFO — gamle undervanns-lots ble realisert med tap mens de
 * profitable lå igjen. Win rate viste ~50 % (skal være ~100 % på lukkede
 * lots når salg kun skjer ≥ +1.5 %).
 *
 * Fiks: strategien sender lot_id i sell-signalet; backtesten konsumerer
 * DEN loten. Pluss posisjons-tak (max_invested_pct) mot ubegrenset
 * posisjonsbygging i fallende trender.
 */
import { describe, it, expect } from "vitest";
import { SimpleGridStrategy } from "@/lib/trading/strategies/simple-grid";
import { runSimpleBacktest } from "@/lib/backtest/simple-backtest";
import type { Candle, MinimalSession, StrategyInput } from "@/lib/trading/strategies/types";

function candle(close: number, i: number): Candle {
  return { time: 1_800_000_000_000 + i * 300_000, open: close, high: close, low: close, close, volume: 1000 };
}
function candlesAv(priser: number[]): Candle[] {
  return priser.map((p, i) => candle(p, i));
}
const NÅ = 1_800_000_000_000;

function input(candles: Candle[], session: MinimalSession, config = {}): StrategyInput {
  return { candles, session, config, currentTime: NÅ };
}

describe("BUG-FIKS: riktig lot selges (ikke FIFO)", () => {
  const strat = new SimpleGridStrategy();

  it("sell-signal inneholder lot_id for den profitable loten", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(102)];
    const session = {
      open_position: {
        side: "long" as const,
        quantity: 1,
        entry_price: 100,
        entry_time: new Date(NÅ - 7200_000).toISOString(),
        lots: [{
          id: "lot-42", quantity: 0.5, entryPrice: 100,
          timestamp: new Date(NÅ - 7200_000).toISOString(), originalQuantity: 0.5,
        }],
      },
      last_tick_at: null,
      strategy_config: {},
    };
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
    expect(sig.indicators?.lot_id).toBe("lot-42");
  });

  it("backtest selger den NYE billige (profitable) loten — ikke den gamle dyre", () => {
    // Dip INNENFOR grid-rekkevidden: 100×100, 5×93 (nivå 4), så 95.
    // Grid kjøper lot B på 93 (dypeste ufylte nivå); ved 95 er B ≥ +1.5 %
    // (94.58 inkl. slippage — sluttpris må OVER fyll-prisen × 1.015).
    // Første salg MÅ være lot B med profitt — med FIFO-buggen ble lot A (100)
    // solgt i tap i stedet.
    const candles = [
      ...candlesAv(Array(100).fill(100)),
      ...candlesAv(Array(5).fill(93)),
      candle(95),
    ];
    const res = runSimpleBacktest({ candles, initialCapital: 10000, config: { dca_interval_hours: 999999 } });
    const førsteSalg = res.trades.find((t) => t.side === "sell");
    expect(førsteSalg).toBeDefined();
    expect(førsteSalg!.realizedPnl).toBeGreaterThan(0);
  });

  it("alle lukkede lots er i gevinst (salg skjer kun ≥ +1.5 %)", () => {
    // Sidelengs marked: alle salg skal være gevinst — ingen tap-realisationer
    const candles = Array.from({ length: 400 }, (_, i) =>
      candle(100 + 3 * Math.sin((i * Math.PI) / 6), i),
    );
    const res = runSimpleBacktest({ candles, initialCapital: 10000 });
    expect(res.metrics.closedTrades).toBeGreaterThan(0);
    expect(res.metrics.winRate).toBe(100);
  });
});

describe("Posisjons-tak (max_invested_pct)", () => {
  const strat = new SimpleGridStrategy();

  it("blokkerer grid-kjøp når investert ≥ 60 % av kapital", () => {
    // Pris 3 % under anker (grid-nivå treffes), men hele kapitalen er investert
    const candles = [...candlesAv(Array(48).fill(100)), candle(97)];
    const mangeLots = Array.from({ length: 20 }, (_, i) => ({
      id: `l${i}`, quantity: 6, entryPrice: 96 + i * 0.1,
      timestamp: new Date(NÅ - 3600_000).toISOString(), originalQuantity: 6,
    }));
    const session = {
      open_position: {
        side: "long" as const,
        quantity: 120, entry_price: 97,
        entry_time: mangeLots[0].timestamp, lots: mangeLots,
      },
      last_tick_at: null,
      strategy_config: {},
      current_capital_nok: 1000, // lite cash igjen — investert-verdi >> 60 %
    } as unknown as MinimalSession;
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).not.toBe("buy");
    expect(sig.indicators?.blocked_by).toBe("max_invested");
  });

  it("blokkerer også DCA når over taket", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(100)];
    const session = {
      open_position: {
        side: "long" as const,
        quantity: 120, entry_price: 100,
        entry_time: new Date(NÅ - 10 * 3600_000).toISOString(),
        lots: Array.from({ length: 20 }, (_, i) => ({
          id: `l${i}`, quantity: 6, entryPrice: 100,
          timestamp: new Date(NÅ - 10 * 3600_000).toISOString(), originalQuantity: 6,
        })),
      },
      last_tick_at: null,
      strategy_config: {},
      current_capital_nok: 1000,
    } as unknown as MinimalSession;
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).not.toBe("buy");
  });

  it("salg er ALDRI blokkert av taket", () => {
    const candles = [...candlesAv(Array(48).fill(100)), candle(102)];
    const session = {
      open_position: {
        side: "long" as const,
        quantity: 120, entry_price: 100,
        entry_time: new Date(NÅ - 3600_000).toISOString(),
        lots: Array.from({ length: 20 }, (_, i) => ({
          id: `l${i}`, quantity: 6, entryPrice: 100,
          timestamp: new Date(NÅ - 3600_000).toISOString(), originalQuantity: 6,
        })),
      },
      last_tick_at: null,
      strategy_config: {},
      current_capital_nok: 1000,
    } as unknown as MinimalSession;
    const sig = strat.evaluate(input(candles, session));
    expect(sig.action).toBe("sell");
  });
});
