/**
 * SimpleGridStrategy — COMBO (grid ±1.5 % + DCA hver 4. time).
 *
 * Mega-plan Oppgave 2.1 — Pilot-strategien. ÉN strategi, null innstillinger.
 * Mekanisk og deterministisk: ingen AI-kall, ingen regime-deteksjon —
 * derfor er backtest == live-oppførsel, og hver handel kan forklares med
 * én norsk setning («Prisen falt, Piloten kjøpte billig»).
 *
 * TILSTANDSLØS design (2026-08-10): tick-motoren har ingen generell
 * state-kanal (kun en hardkodet grid-trailing-up-mekanisme), og tick er
 * Hermes-sone. Derfor:
 * - Anker = median av siste `anchor_candles` closes (selvjusterende)
 * - Fylte nivåer avledes fra session.open_position.lots (FIFO-ledgeren
 *   i tick vedlikeholder dem ved kjøp/salg)
 *
 * Regler (én aksjon per tick, prioritet i denne rekkefølgen):
 * 1. SELG: lot med pris ≥ entry × (1 + grid_step) → ta gevinsten
 * 2. GRID-KJØP: dypeste utløste nivå som ikke allerede er fylt
 * 3. DCA: ingen kjøp på `dca_interval_hours` (eller helt ny sesjon)
 * 4. HOLD: vent og forklar
 *
 * Basert på Bitsgap H1 2026-data: COMBO = 57.85 % win rate
 * (grid alene: 35.14 %, DCA alene: −0.10 %).
 */

import type {
  MinimalSession,
  StrategyEngine,
  StrategyInput,
  StrategySignal,
} from "./types";

export const SIMPLE_GRID_DEFAULTS = {
  /** Nivåavstand OG gevinstterskel (%) — «±1.5 %-regelen» */
  grid_step_pct: 1.5,
  /** Antall kjøpsnivåer under anker */
  grid_levels: 5,
  /** Andel av kapital per grid-kjøp (5 %) */
  grid_amount_pct: 0.05,
  /** DCA-intervall i timer */
  dca_interval_hours: 4,
  /** Andel av kapital per DCA-kjøp (2 %) */
  dca_amount_pct: 0.02,
  /** Antall closes i anker-medianen (48 × 5 min = 4 timer) */
  anchor_candles: 48,
  /** Toleranse for «nivå allerede fylt» (%) */
  level_tolerance_pct: 0.25,
} as const;

type Lots = NonNullable<
  NonNullable<MinimalSession["open_position"]>["lots"]
>;

function median(verdier: number[]): number {
  const s = [...verdier].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export class SimpleGridStrategy implements StrategyEngine {
  evaluate(input: StrategyInput): StrategySignal {
    const { candles, session, config } = input;
    const cfg = { ...SIMPLE_GRID_DEFAULTS, ...config };
    const nå = input.currentTime ?? Date.now();

    if (!candles || candles.length === 0) {
      return { action: "hold", reason: "Ingen prisdata ennå — venter." };
    }

    const pris = candles[candles.length - 1].close;
    const ankerCandles = candles.slice(-cfg.anchor_candles);
    const anker = median(ankerCandles.map((c) => c.close));

    const lots: Lots = session.open_position?.lots ?? [];
    const kapital =
      ((session as unknown as Record<string, unknown>)
        ?.current_capital_nok as number) ??
      (config?.capital as number) ??
      10000;

    const steg = cfg.grid_step_pct / 100;
    const toleranse = cfg.level_tolerance_pct / 100;

    // ── 1. SELG: gevinst ≥ grid_step på noen lot ─────────────────────────
    for (const lot of lots) {
      const terskel = lot.entryPrice * (1 + steg);
      if (pris >= terskel) {
        const gevinstPct = ((pris - lot.entryPrice) / lot.entryPrice) * 100;
        return {
          action: "sell",
          quantity: lot.quantity,
          confidence: 0.8,
          exitReason: "take_profit",
          indicators: {
            grid_sell: true,
            entry_price: lot.entryPrice,
            profit_pct: Number(gevinstPct.toFixed(2)),
          },
          reason: `Prisen steg ${gevinstPct.toFixed(1)} % siden kjøpet — Piloten solgte med gevinst.`,
        };
      }
    }

    // ── 2. GRID-KJØP: dypeste utløste, ikke-fylte nivå ───────────────────
    let dypesteNivå = 0;
    for (let k = 1; k <= cfg.grid_levels; k++) {
      const nivåPris = anker * (1 - k * steg);
      if (pris <= nivåPris) dypesteNivå = k;
    }

    if (dypesteNivå > 0) {
      const nivåPris = anker * (1 - dypesteNivå * steg);
      const alleredeFylt = lots.some(
        (lot) => Math.abs(lot.entryPrice - nivåPris) <= nivåPris * toleranse,
      );
      if (!alleredeFylt) {
        const fallPct = ((anker - pris) / anker) * 100;
        return {
          action: "buy",
          positionSize: cfg.grid_amount_pct,
          confidence: 0.7,
          indicators: {
            grid_level: dypesteNivå,
            level_price: Number(nivåPris.toFixed(8)),
            anchor: Number(anker.toFixed(8)),
          },
          reason: `Prisen falt ${fallPct.toFixed(1)} % under snittet — Piloten kjøpte billig (nivå ${dypesteNivå}).`,
        };
      }
    }

    // ── 3. DCA: ny sesjon, eller lenge siden siste kjøp ──────────────────
    if (lots.length === 0) {
      return {
        action: "buy",
        positionSize: cfg.dca_amount_pct,
        confidence: 0.6,
        indicators: { dca: true, initial: true },
        reason: "Første kjøp — Piloten starter forsiktig og bygger opp gradvis.",
      };
    }

    const nyesteKjøp = Math.max(
      ...lots.map((l) => new Date(l.timestamp).getTime()),
    );
    const timerSiden = (nå - nyesteKjøp) / 3600_000;
    if (timerSiden >= cfg.dca_interval_hours) {
      return {
        action: "buy",
        positionSize: cfg.dca_amount_pct,
        confidence: 0.6,
        indicators: { dca: true, hours_since_last_buy: Number(timerSiden.toFixed(1)) },
        reason: `Rolig marked — Piloten kjøper litt hver ${cfg.dca_interval_hours}. time, uansett pris.`,
      };
    }

    // ── 4. HOLD ──────────────────────────────────────────────────────────
    return {
      action: "hold",
      indicators: {
        anchor: Number(anker.toFixed(8)),
        current_price: pris,
        open_lots: lots.length,
      },
      reason: "Venter — prisen er ikke ved et kjøpsnivå, og det er ikke lenge siden forrige kjøp.",
    };
  }
}
