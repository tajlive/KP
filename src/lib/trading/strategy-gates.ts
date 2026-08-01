/**
 * strategy-gates.ts — Fase 2 strategi-oppgraderinger (2026-07-31)
 *
 * Rene, testbare funksjoner som wires inn i tick-motoren:
 *  2.1 evaluateRegimeGate    — blokker kjøp i sterk nedadgående regime
 *  2.2 evaluateTrailingExit  — trailing take-profit + scale-out
 *  2.3 evaluateAntiWhipsaw   — blokker re-kjøp rett etter salg (whipsaw)
 *  2.4 userJitter-familien   — deterministisk per-bruker spredning
 *  2.5 symbolEdgeWeight      — posisjonsvekting etter historisk edge
 *
 * Læring fra prod (2026-07-31): 36 lukkede BTC-trades, 0 seire, -585 NOK.
 * Whipsaw-mønster (salg → kjøp 5 min senere med tap) og identiske entries
 * på tvers av 40 brukere var hoveddriverne.
 */

// ─────────────────────────────────────────────────────────────
// 2.1 REGIME-GATE
// ─────────────────────────────────────────────────────────────

export type Regime = "trend_up" | "range" | "trend_down" | "crash";

export interface RegimeGateResult {
  allowed: boolean;
  regime: Regime;
  reason: string;
}

function smaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Enkel lineær slope (% per steg) over siste N verdier av en SMA-serie. */
function smaSlopePct(values: number[], period: number, lookback: number): number | null {
  if (values.length < period + lookback) return null;
  const now = smaLast(values, period);
  const then = smaLast(values.slice(0, values.length - lookback), period);
  if (now === null || then === null || then === 0) return null;
  return ((now - then) / then) * 100;
}

/**
 * Klassifiser markedsregime fra close-priser (f.eks. 1h-candles).
 *  - crash:      pris > crashDropPct under slow-SMA (brått fall)
 *  - trend_down: fast < slow OG negativ slope
 *  - trend_up:   fast > slow OG ikke-negativ slope
 *  - range:      ellers
 */
export function classifyRegime(
  closes: number[],
  fastPeriod = 20,
  slowPeriod = 50,
  crashDropPct = 8,
): Regime {
  const fast = smaLast(closes, fastPeriod);
  const slow = smaLast(closes, slowPeriod);
  if (fast === null || slow === null || closes.length === 0) return "range";

  const price = closes[closes.length - 1];
  const slope = smaSlopePct(closes, fastPeriod, 5) ?? 0;
  // Crash: pris langt under slow-SMA OG akselererende fall (bratt slope)
  if (slow > 0 && price < slow * (1 - crashDropPct / 100) && slope < -2.0) return "crash";
  if (fast < slow && slope < -0.1) return "trend_down";
  if (fast > slow && slope >= -0.1) return "trend_up";
  return "range";
}

/**
 * Regime-gate for kjøp. Kjøp blokkeres i 'crash' og 'trend_down'
 * (faller kniv-prinsippet); tillates i 'trend_up' og 'range'.
 */
export function evaluateRegimeGate(
  closes: number[],
  opts?: { fastPeriod?: number; slowPeriod?: number; crashDropPct?: number },
): RegimeGateResult {
  const regime = classifyRegime(
    closes,
    opts?.fastPeriod,
    opts?.slowPeriod,
    opts?.crashDropPct,
  );
  if (regime === "crash") {
    return {
      allowed: false,
      regime,
      reason: "KJØP blokkert: regime=crash — pris langt under slow-SMA (faller kniv)",
    };
  }
  if (regime === "trend_down") {
    return {
      allowed: false,
      regime,
      reason: "KJØP blokkert: regime=trend_down — fast-SMA under slow-SMA med negativ slope",
    };
  }
  return { allowed: true, regime, reason: `regime=${regime} — kjøp tillatt` };
}

// ─────────────────────────────────────────────────────────────
// 2.3 ANTI-WHIPSAW
// ─────────────────────────────────────────────────────────────

export interface AntiWhipsawInput {
  /** Tidspunkt for siste salg av dette symbolet (ISO). null = ingen salg. */
  lastSellAt?: string | null;
  /** Prisen vi solgte på. */
  lastSellPrice?: number | null;
  /** Nåværende pris (samme enhet som lastSellPrice). */
  currentPrice: number;
  /** Cooldown-vindu etter salg. Default 30 min. */
  cooldownMs?: number;
  /** Minste prisbevegelse (%) fra salgspris som opphever blokken. Default 2 %. */
  minMovePct?: number;
  /** Nå-tid (ms epoch) — injiserbar for tester. */
  nowMs?: number;
}

export interface GateResult {
  allowed: boolean;
  reason: string;
}

/**
 * Anti-whipsaw: etter et salg skal vi ikke kjøpe tilbake samme symbol
 * innen cooldown-vinduet MED MINDRE prisen har beveget seg ≥ minMovePct
 * fra salgsprisen (da er det en genuint ny situasjon, ikke whipsaw).
 *
 * Prod-bevis 2026-07-31: salg 04:56 → kjøp 05:00 (4 min) med umiddelbart tap.
 */
export function evaluateAntiWhipsaw(input: AntiWhipsawInput): GateResult {
  if (!input.lastSellAt || !input.lastSellPrice || input.lastSellPrice <= 0) {
    return { allowed: true, reason: "ingen nylig salg — kjøp tillatt" };
  }
  const cooldownMs = input.cooldownMs ?? 30 * 60 * 1000;
  const minMovePct = input.minMovePct ?? 2;
  const nowMs = input.nowMs ?? Date.now();
  const elapsed = nowMs - new Date(input.lastSellAt).getTime();

  if (elapsed >= cooldownMs) {
    return { allowed: true, reason: `cooldown over (${Math.round(elapsed / 60000)} min siden salg)` };
  }

  const movePct = Math.abs(input.currentPrice - input.lastSellPrice) / input.lastSellPrice * 100;
  if (movePct >= minMovePct) {
    return {
      allowed: true,
      reason: `pris beveget ${movePct.toFixed(1)}% fra salgspris — ny situasjon, kjøp tillatt`,
    };
  }

  const waitMin = Math.ceil((cooldownMs - elapsed) / 60000);
  return {
    allowed: false,
    reason: `KJØP blokkert (anti-whipsaw): solgt for ${Math.round(elapsed / 60000)} min siden, pris bare ${movePct.toFixed(1)}% fra salgspris (<${minMovePct}%). Vent ${waitMin} min eller større bevegelse.`,
  };
}

// ─────────────────────────────────────────────────────────────
// 2.4 PER-BRUKER JITTER (deterministisk)
// ─────────────────────────────────────────────────────────────

/** FNV-1a 32-bit — rask, deterministisk, god nok spredning for jitter. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministisk tall i [0,1) per (userId, salt). */
export function userJitter(userId: string, salt = ""): number {
  return fnv1a(`${userId}:${salt}`) / 0xffffffff;
}

/**
 * Posisjonsstørrelse-jitter: 0.90–1.10 × per bruker+symbol.
 * Bryter identiske entries på tvers av 40 brukere (alle kjøpte samme
 * kvantum på samme tick 2026-07-31 05:00).
 */
export function jitteredSizeMultiplier(userId: string, symbol: string): number {
  return 0.9 + userJitter(userId, `size:${symbol}`) * 0.2;
}

/**
 * Tids-bucket: brukeren får en fast bucket [0..buckets-1]. Tick-motoren kan
 * kreve at currentMinute % buckets === bucket før nye KJØP — sprer entries
 * over flere minutter uten å blokkere exits.
 */
export function userTickBucket(userId: string, buckets = 3): number {
  return Math.floor(userJitter(userId, "bucket") * buckets);
}

// ─────────────────────────────────────────────────────────────
// 2.5 SYMBOL-EDGE-VEKTING
// ─────────────────────────────────────────────────────────────

export interface SymbolEdgeStats {
  /** Antall lukkede trades i observasjonsvinduet. */
  trades: number;
  /** Gjennomsnittlig realized P&L per trade i %. null = ukjent. */
  expectancyPct: number | null;
  /** grossWin / grossLoss. null = ingen vinnertap-data. */
  profitFactor: number | null;
}

/**
 * Vekt [0.5, 1.3] basert på historisk edge for symbolet.
 *  - < minTrades observasjoner → 1.0 (nøytral, ikke straff lite data)
 *  - Positiv expectancy + PF > 1.2 → mot 1.3
 *  - Negativ expectancy eller PF < 0.8 → mot 0.5
 */
export function symbolEdgeWeight(
  stats: SymbolEdgeStats,
  minTrades = 10,
): number {
  if (stats.trades < minTrades) return 1.0;

  let score = 0;
  if (stats.expectancyPct !== null) {
    // expectancy ±2% mappes til ±1 (clamped)
    score += Math.max(-1, Math.min(1, stats.expectancyPct / 2));
  }
  if (stats.profitFactor !== null) {
    // PF 1.0 = nøytral; 1.5+ → +1; 0.5 → -1
    score += Math.max(-1, Math.min(1, (stats.profitFactor - 1) * 2));
  }
  // score i [-2, 2] → vekt i [0.5, 1.3]
  const weight = 1 + score * 0.4;
  return Math.round(Math.max(0.5, Math.min(1.3, weight)) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────
// 2.2 TRAILING TAKE-PROFIT + SCALE-OUT
// ─────────────────────────────────────────────────────────────

export interface TrailingExitInput {
  /** Veiet snitt inngangspris. */
  entryPrice: number;
  /** Høyeste pris siden entry (highest_price fra posisjonen). */
  peakPrice: number;
  /** Nåværende pris. */
  currentPrice: number;
  /** Trailing aktiveres når gevinst ≥ activationPct. Default 4 %. */
  activationPct?: number;
  /** Slipp fra topp som trigger full exit. Default 2.5 %. */
  trailPct?: number;
  /** Scale-out-nivå: selg en andel ved +scaleOutPct. Default 3 %. */
  scaleOutPct?: number;
  /** Andel som selges ved scale-out. Default 0.5 (50 %). */
  scaleOutFraction?: number;
  /** Har posisjonen allerede scale-et ut? */
  alreadyScaledOut?: boolean;
}

export interface TrailingExitResult {
  action: "hold" | "scale_out" | "trailing_exit";
  reason: string;
  /** Andel av posisjonen som skal selges (1 = alt). */
  sellFraction: number;
  /** Ny peak (kan ha steget denne ticken). */
  newPeak: number;
}

/**
 * Trailing take-profit med scale-out:
 *  1. Ved +scaleOutPct: selg scaleOutFraction (lås gevinst på halvparten).
 *  2. Ved +activationPct: trailing stop aktiveres — full exit hvis prisen
 *     faller trailPct fra topp.
 *  3. Ellers: hold (peak oppdateres av kaller).
 *
 * Prod-problemet dette løser: fast TP på 15 % (smart-trader) og 5–8 %
 * (pilot-engine) lot aldri gevinstene løpe, mens tapene (fast SL) var
 * garanterte → 0/36 seire.
 */
export function evaluateTrailingExit(input: TrailingExitInput): TrailingExitResult {
  const activationPct = input.activationPct ?? 4;
  const trailPct = input.trailPct ?? 2.5;
  const scaleOutPct = input.scaleOutPct ?? 3;
  const scaleOutFraction = input.scaleOutFraction ?? 0.5;

  const newPeak = Math.max(input.peakPrice, input.currentPrice);
  const pnlPct = ((input.currentPrice - input.entryPrice) / input.entryPrice) * 100;
  const peakPnlPct = ((newPeak - input.entryPrice) / input.entryPrice) * 100;

  // 1. Scale-out først (lås delgevinst) — kun én gang
  if (!input.alreadyScaledOut && pnlPct >= scaleOutPct && peakPnlPct < activationPct) {
    return {
      action: "scale_out",
      reason: `scale-out: +${pnlPct.toFixed(1)}% ≥ ${scaleOutPct}% — selger ${(scaleOutFraction * 100).toFixed(0)}% og lar resten løpe`,
      sellFraction: scaleOutFraction,
      newPeak,
    };
  }

  // 2. Trailing stop etter aktivering
  if (peakPnlPct >= activationPct) {
    const dropFromPeakPct = ((newPeak - input.currentPrice) / newPeak) * 100;
    if (dropFromPeakPct >= trailPct) {
      return {
        action: "trailing_exit",
        reason: `trailing-exit: topp +${peakPnlPct.toFixed(1)}%, falt ${dropFromPeakPct.toFixed(1)}% fra topp (≥${trailPct}%) — låser gevinst`,
        sellFraction: 1,
        newPeak,
      };
    }
    // Trailing aktiv men ikke truffet — hold. Ikke scale-out i trailing-sonen;
    // trailing-mekanismen erstatter skalering (skala-ut skjedde allerede før aktivering).
    return {
      action: "hold",
      reason: `hold (trailing aktiv): topp +${peakPnlPct.toFixed(1)}%, ${dropFromPeakPct.toFixed(1)}% fra topp`,
      sellFraction: 0,
      newPeak,
    };
  }

  return {
    action: "hold",
    reason: `hold: pnl ${pnlPct.toFixed(1)}%, topp +${peakPnlPct.toFixed(1)}%`,
    sellFraction: 0,
    newPeak,
  };
}
