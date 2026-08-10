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
import { atr } from "./indicators";

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
  /** Posisjons-tak: maks andel av kapital investert (60 %) — stopper
      ubegrenset posisjonsbygging i fallende trender. Salg blokkeres aldri. */
  max_invested_pct: 0.6,
  /** Drawdown-gate (2026-08-10): ingen kjøp når prisen er mer enn
      (1 − verdi) under toppen av siste slow_anchor_candles closes.
      0.8 = maks 20 % under 30-dagers topp. Salg blokkeres aldri. */
  dd_gate_pct: 0.8,
  /** Tregt regime-vindu for drawdown-gate: 720 × 1h = 30 dager */
  slow_anchor_candles: 720,
  /** «Slipp posene» (2026-08-10, Toms krav): ved drawdown-gate SELGES
      hele posisjonen kontrollert — liten styrt tap nå, heller enn −40 %
      undervanns-poser i månedsvis. Piloten kjøper inn igjen billigere
      når markedet stabiliserer seg (gaten åpner automatisk). */
  liquidate_on_range_exit: true,
  /** E1 (Pilot 2.0): adaptiv grid-steg = ATR_14 i % av pris, clampet til
      [step_min, step_max]. Evidens: dcabot 2år-backtest +11.4pp vs fast steg. */
  adaptive_step: false,
  step_min_pct: 1.0,
  step_max_pct: 3.0,
  atr_period: 14,
  /** E2 (Pilot 2.0): smart DCA — kjøp MER jo dypere prisen er under ankeret
      (multiplikator = 1 + fall/steg, cap smart_dca_max_mult).
      Evidens: dcabot +10.6pp vs vanlig DCA. */
  smart_dca: false,
  smart_dca_max_mult: 3,
  /** E3 (2026-08-10, full-syklus-bevis + Toms compounding-poeng):
      asymmetrisk exit — selg bare DENNE ANDELEN av loten på grid-nivå,
      la resten («runner») løpe med breakeven-gulv. Fixed TP amputerer
      høyrehalen (+380 %/+918 %-rallyene); runneren fanger den.
      «Fixed take profits destroy returns» — trading-agent-prinsipp #2. */
  partial_sell_pct: 0.5,
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

    // E1: adaptiv steg = ATR_14 i % av pris (clampet). Fast steg ellers.
    let steg = cfg.grid_step_pct / 100;
    if (cfg.adaptive_step && candles.length >= cfg.atr_period + 1) {
      const atrAbs = atr(
        candles.map((c) => c.high),
        candles.map((c) => c.low),
        candles.map((c) => c.close),
        cfg.atr_period,
      );
      const atrPct = (atrAbs / pris) * 100;
      steg =
        Math.min(
          Math.max(atrPct, cfg.step_min_pct),
          cfg.step_max_pct,
        ) / 100;
    }
    const toleranse = cfg.level_tolerance_pct / 100;

    // ── 1. SELG: asymmetrisk exit (E3, 2026-08-10) ───────────────────────
    // Runner (delvis solgt): breakeven-gulv — aldri la en vinner bli taper.
    // Ny lot på grid-nivå: selg KUN partial_sell_pct, la resten løpe.
    for (const lot of lots) {
      const erRunner = lot.quantity < lot.originalQuantity * 0.999;

      if (erRunner) {
        if (pris < lot.entryPrice) {
          return {
            action: "sell",
            quantity: lot.quantity,
            confidence: 0.85,
            exitReason: "breakeven_stop",
            indicators: {
              lot_id: lot.id,
              entry_price: lot.entryPrice,
            },
            reason: "Prisen falt tilbake til kjøpsprisen — Piloten sikret resten. Ingen tap på denne.",
          };
        }
        continue; // Runner løper videre og fanger høyrehalen
      }

      const terskel = lot.entryPrice * (1 + steg);
      if (pris >= terskel) {
        const gevinstPct = ((pris - lot.entryPrice) / lot.entryPrice) * 100;
        const selges = Math.min(lot.originalQuantity * cfg.partial_sell_pct, lot.quantity);
        return {
          action: "sell",
          quantity: selges,
          confidence: 0.8,
          exitReason: "take_profit_partial",
          indicators: {
            lot_id: lot.id,
            grid_sell: true,
            partial: true,
            entry_price: lot.entryPrice,
            profit_pct: Number(gevinstPct.toFixed(2)),
          },
          reason: `Prisen steg ${gevinstPct.toFixed(1)} % — Piloten solgte halvparten med gevinst og lar resten løpe videre.`,
        };
      }
    }

    // ── Drawdown-gate: pris >20 % under 30-dagers topp → ingen kjøp ─────
    // (2026-08-10, erstatter median-gate som var for treg i krasj.)
    // Rolling topp faller ikke med prisen → gaten slår igjen raskt i krasj,
    // og gjenåpner når markedet stabiliserer seg (på ethvert nivå).
    // Salg blokkeres ALDRI. Grid kjøper kun når det verste fallet er over.
    const tregCandles = candles.slice(-cfg.slow_anchor_candles);
    const topp720 = Math.max(...tregCandles.map((c) => c.close));
    if (tregCandles.length >= 48 && pris < topp720 * cfg.dd_gate_pct) {
      // «Slipp posene»: selg ALT kontrollert ved krasj (Toms krav 2026-08-10).
      // Liten styrt tap nå > −40 % undervanns-poser i månedsvis.
      if (cfg.liquidate_on_range_exit && lots.length > 0) {
        const totalKvantum = lots.reduce((s, l) => s + l.quantity, 0);
        return {
          action: "sell",
          quantity: totalKvantum,
          confidence: 0.9,
          exitReason: "range_exit",
          indicators: {
            regime: "range_exit_liquidation",
            rolling_high: Number(topp720.toFixed(8)),
            dd_from_high_pct: Number(((1 - pris / topp720) * 100).toFixed(1)),
          },
          reason: `Markedet har falt over ${Math.round((1 - cfg.dd_gate_pct) * 100)} % fra toppen — Piloten solgte for å beskytte pengene dine, og kjøper inn igjen billigere når det roer seg.`,
        };
      }
      return {
        action: "hold",
        indicators: {
          regime: "drawdown_paused",
          rolling_high: Number(topp720.toFixed(8)),
          current_price: pris,
          dd_from_high_pct: Number(((1 - pris / topp720) * 100).toFixed(1)),
        },
        reason: `Prisen er over ${Math.round((1 - cfg.dd_gate_pct) * 100)} % under toppen fra siste måned — Piloten pauser kjøp til fallet har stanset seg. Pengene dine er trygge.`,
      };
    }

    // ── Grid-pause: pris under HELE rutenettet → ingen kjøp (kanonisk
    // grid-oppførsel: Pionex/3Commas pauser når prisen forlater rangen.
    // Forhindrer «catch a falling knife» i vedvarende trender.) ──────────
    const gridBunn = anker * (1 - cfg.grid_levels * steg);
    if (pris < gridBunn && lots.length > 0) {
      return {
        action: "hold",
        indicators: {
          paused_below_grid: true,
          grid_lower: Number(gridBunn.toFixed(8)),
          current_price: pris,
        },
        reason: `Prisen har falt under hele rutenettet — Piloten venter til den er tilbake på normalnivå før nye kjøp. Pengene dine er trygge.`,
      };
    }

    // ── Posisjons-tak: blokker kjøp når investert ≥ max_invested_pct ─────
    const cash =
      ((session as unknown as Record<string, unknown>)
        ?.current_capital_nok as number) ??
      (config?.capital as number) ??
      10000;
    const investertVerdi = lots.reduce((s, l) => s + l.quantity * pris, 0);
    const egenkapital = cash + investertVerdi;
    const overTaket =
      egenkapital > 0 && investertVerdi / egenkapital >= cfg.max_invested_pct;

    if (overTaket && lots.length > 0) {
      return {
        action: "hold",
        indicators: {
          blocked_by: "max_invested",
          invested_pct: Number(((investertVerdi / egenkapital) * 100).toFixed(1)),
        },
        reason: `Piloten har investert maksimalt tillatt (${cfg.max_invested_pct * 100} %). Venter på salg før nye kjøp.`,
      };
    }

    // ── 2. GRID-KJØP: dypeste utløste, ikke-fylte nivå ───────────────────
    let dypesteNivå = 0;
    for (let k = 1; k <= cfg.grid_levels; k++) {
      const nivåPris = anker * (1 - k * steg);
      if (pris <= nivåPris) dypesteNivå = k;
    }

    if (dypesteNivå > 0) {
      const nivåPris = anker * (1 - dypesteNivå * steg);
      // BUG-FIKS #3 (2026-08-10): nivå er «fylt» hvis det finnes en lot i
      // båndet [nivå − steg, nivå + toleranse]. Slippage flytter fyll-prisen
      // under nivå-prisen, så ren punkt-toleranse ga DUPLET-kjøp på samme
      // nivå for hver candle (observert: 5× kjøp på samme dip).
      const båndBunn = nivåPris * (1 - steg);
      const båndTopp = nivåPris * (1 + toleranse);
      const alleredeFylt = lots.some(
        (lot) => lot.entryPrice >= båndBunn && lot.entryPrice <= båndTopp,
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
      // E2: smart DCA — kjøp mer jo dypere prisen er under ankeret
      let mult = 1;
      if (cfg.smart_dca && pris < anker) {
        const fallISteg = (anker - pris) / anker / steg;
        mult = Math.min(1 + fallISteg, cfg.smart_dca_max_mult);
      }
      return {
        action: "buy",
        positionSize: cfg.dca_amount_pct * mult,
        confidence: 0.6,
        indicators: {
          dca: true,
          hours_since_last_buy: Number(timerSiden.toFixed(1)),
          ...(mult > 1 ? { smart_dca_mult: Number(mult.toFixed(2)) } : {}),
        },
        reason:
          mult > 1
            ? `Prisen er godt under snittet — Piloten kjøper litt ekstra mens den er billig.`
            : `Rolig marked — Piloten kjøper litt hver ${cfg.dca_interval_hours}. time, uansett pris.`,
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
