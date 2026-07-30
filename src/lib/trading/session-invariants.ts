/**
 * Fase 4: Invariant-sjekker for paper trading (rene funksjoner, testbare).
 *
 * Tre invarianter overvåkes av cron balance-drift-check:
 *
 * 1. negative_capital — sesjonskapital skal aldri være negativ.
 *    Håndheves også av CHECK-constraint `trading_sessions_capital_nonnegative`,
 *    men denne fanger brudd hvis constraint fjernes eller data skrives forbi.
 *
 * 2. extreme_growth — kapital > 10× startkapital er et varselssignal.
 *    Fase 2-saneringen verifiserte at opptil ~2× vekst kan være ærlig
 *    (kapital ≈ initial + FIFO-P&L + posisjonsgrunnlag), så terskelen er
 *    bevisst satt høyt for å unngå falske alarmer.
 *
 * 3. negative_position — beholdning skal aldri være negativ. Dette er den
 *    sanne oversalgs-fangeren: triggeren clamper salg til beholdning, så en
 *    negativ posisjon betyr at noe har skrevet forbi triggeren.
 *    (All-time sold>bought i trades er IKKE en brudd-indikator — det er
 *    uforanderlig historikk fra den gamle buggen.)
 *
 * 4. predictSessionHealth() — prediktiv helsescore for auto-heal.
 *    Returnerer en score 0-100 basert på loss streaks, kapitaltrend,
 *    trade-frekvens, og nylig PnL.
 */

export const EXTREME_GROWTH_MULTIPLIER = 10;

export interface SessionCapitalRow {
  id: string;
  user_id: string;
  current_capital: number | string | null;
  current_capital_nok: number | string | null;
  initial_capital?: number | string | null;
  starting_capital_nok?: number | string | null;
}

export interface PositionQuantityRow {
  id: string;
  session_id: string | null;
  user_id: string | null;
  symbol: string;
  quantity: number | string | null;
}

export type InvariantKind =
  | "negative_capital"
  | "extreme_growth"
  | "negative_position";

export interface InvariantViolation {
  kind: InvariantKind;
  sessionId: string | null;
  userId: string | null;
  detail: string;
  /** Verdi som utløste bruddet (f.eks. negativ kapital eller posisjon). */
  value: number;
}

/**
 * Prediktiv helsescore for en trading-sesjon.
 * Score: 0-100 hvor 100 = perfekt helse.
 *
 * Faktorer som trekker ned:
 *   - Loss streaks (consecutive losses) — tyngst vekt
 *   - Kapitalnedgang (drawdown) — nest tyngst
 *   - Høy trade-frekvens (overtrading)
 *   - Dårlig nylig PnL (siste N trades)
 *
 * Terskler:
 *   >= 80: healthy
 *   50-79: warning
 *   < 50:  critical
 */
export interface SessionHealthInput {
  /** Antall consecutive tapende trades */
  consecutiveLosses: number;
  /** Nåværende kapital */
  currentCapital: number;
  /** Startkapital (for beregning av drawdown) */
  startingCapital: number;
  /** Antall trades siste 24 timer */
  tradesLast24h: number;
  /** PnL for de siste N trades (eldste først) */
  recentPnLs: number[];
  /** Antall sekunder siden siste heartbeat */
  secondsSinceLastHeartbeat?: number;
  /** Maks tillatt heartbeat-staleness (sekunder) */
  maxHeartbeatAge?: number;
}

export interface SessionHealthScore {
  /** 0-100 */
  score: number;
  /** "healthy" | "warning" | "critical" */
  status: "healthy" | "warning" | "critical";
  /** Detaljer per faktor */
  details: {
    lossStreakPenalty: number;
    drawdownPenalty: number;
    frequencyPenalty: number;
    recentPnLPenalty: number;
    heartbeatPenalty: number;
  };
}

const HEALTHY_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 50;

/** Maks antall trades per 24t før straff */
const MAX_TRADES_PER_24H = 20;

/** Maks consecutive losses før straff */
const MAX_CONSECUTIVE_LOSSES = 5;

/** Default maks heartbeat-alder (sekunder) */
const DEFAULT_MAX_HEARTBEAT_AGE_SECONDS = 5 * 60; // 5 minutter

export function predictSessionHealth(input: SessionHealthInput): SessionHealthScore {
  const maxHeartbeatAge = input.maxHeartbeatAge ?? DEFAULT_MAX_HEARTBEAT_AGE_SECONDS;

  // 1. Loss streak penalty (0-40 poeng trekk)
  const lossStreakPenalty = Math.min(
    40,
    (input.consecutiveLosses / MAX_CONSECUTIVE_LOSSES) * 40
  );

  // 2. Drawdown penalty (0-30 poeng trekk)
  let drawdownPenalty = 0;
  if (input.startingCapital > 0) {
    const drawdownPct = Math.max(
      0,
      (input.startingCapital - input.currentCapital) / input.startingCapital
    );
    // 100% drawdown = 30 poeng trekk; 0% = 0
    drawdownPenalty = Math.min(30, drawdownPct * 30);
  }

  // 3. Trade frequency penalty (0-15 poeng trekk)
  const frequencyPenalty = input.tradesLast24h > MAX_TRADES_PER_24H
    ? Math.min(
        15,
        ((input.tradesLast24h - MAX_TRADES_PER_24H) / MAX_TRADES_PER_24H) * 15
      )
    : 0;

  // 4. Recent PnL penalty (0-15 poeng trekk)
  let recentPnLPenalty = 0;
  if (input.recentPnLs.length > 0) {
    const totalRecentPnl = input.recentPnLs.reduce((sum, p) => sum + p, 0);
    const avgRecentPnl = totalRecentPnl / input.recentPnLs.length;
    const losingCount = input.recentPnLs.filter((p) => p < 0).length;
    const losingFraction = losingCount / input.recentPnLs.length;

    // Combine magnitude and frequency of losses
    const magnitudePenalty = avgRecentPnl < 0
      ? Math.min(10, Math.abs(avgRecentPnl) * 0.1)
      : 0;
    const frequencyOfLosses = losingFraction * 5;

    recentPnLPenalty = Math.min(15, magnitudePenalty + frequencyOfLosses);
  }

  // 5. Heartbeat penalty (0-10 poeng trekk)
  let heartbeatPenalty = 0;
  if (
    input.secondsSinceLastHeartbeat !== undefined &&
    input.secondsSinceLastHeartbeat > maxHeartbeatAge
  ) {
    const staleness = (input.secondsSinceLastHeartbeat - maxHeartbeatAge) / maxHeartbeatAge;
    heartbeatPenalty = Math.min(10, staleness * 5);
  }

  const totalPenalty = lossStreakPenalty + drawdownPenalty + frequencyPenalty + recentPnLPenalty + heartbeatPenalty;
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  let status: "healthy" | "warning" | "critical";
  if (score >= HEALTHY_THRESHOLD) {
    status = "healthy";
  } else if (score >= CRITICAL_THRESHOLD) {
    status = "warning";
  } else {
    status = "critical";
  }

  return {
    score,
    status,
    details: {
      lossStreakPenalty,
      drawdownPenalty,
      frequencyPenalty,
      recentPnLPenalty,
      heartbeatPenalty,
    },
  };
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Kapital < 0 i en av kolonnene. Tåler NULL (tolkes som 0). */
export function detectNegativeCapital(
  sessions: SessionCapitalRow[]
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const s of sessions) {
    const cap = toNum(s.current_capital);
    const capNok = toNum(s.current_capital_nok);
    const worst = Math.min(cap, capNok);
    if (worst < 0) {
      violations.push({
        kind: "negative_capital",
        sessionId: s.id,
        userId: s.user_id,
        detail: `current_capital=${cap}, current_capital_nok=${capNok}`,
        value: worst,
      });
    }
  }
  return violations;
}

/**
 * Kapital > multiplier × startkapital. Bruker starting_capital_nok når den
 * finnes, ellers initial_capital. Sesjoner uten positiv startkapital
 * hoppes over (kan ikke vurdere forholdstall).
 *
 * exemptUserIds: testbrukere (seedede @klarpakke.test-tradere m.m.) har
 * fabrikkerte trade-historikker med >100× vekst by design — de skal ikke
 * utløse vekst-alarm. Negative-invariantene gjelder fortsatt alle.
 */
export function detectExtremeGrowth(
  sessions: SessionCapitalRow[],
  multiplier: number = EXTREME_GROWTH_MULTIPLIER,
  exemptUserIds?: ReadonlySet<string>
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const s of sessions) {
    if (exemptUserIds?.has(s.user_id)) continue;
    const initial = s.starting_capital_nok != null
      ? toNum(s.starting_capital_nok)
      : toNum(s.initial_capital);
    if (initial <= 0) continue;
    const capNok = toNum(s.current_capital_nok ?? s.current_capital);
    if (capNok > initial * multiplier) {
      violations.push({
        kind: "extreme_growth",
        sessionId: s.id,
        userId: s.user_id,
        detail: `kapital=${capNok.toFixed(2)} > ${multiplier}× start=${initial.toFixed(2)}`,
        value: capNok / initial,
      });
    }
  }
  return violations;
}

/** Beholdning < 0 — betyr salg har gått forbi trigger-clampen. */
export function detectNegativePositions(
  positions: PositionQuantityRow[]
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const p of positions) {
    const qty = toNum(p.quantity);
    if (qty < 0) {
      violations.push({
        kind: "negative_position",
        sessionId: p.session_id ?? null,
        userId: p.user_id ?? null,
        detail: `${p.symbol}: quantity=${qty}`,
        value: qty,
      });
    }
  }
  return violations;
}

/**
 * Kjør alle invariant-sjekker og returnér samlet liste.
 * growthExemptUserIds fritar kun fra extreme_growth (testdata med >100×
 * vekst by design); negative_capital og negative_position gjelder alle.
 */
export function checkAllInvariants(
  sessions: SessionCapitalRow[],
  positions: PositionQuantityRow[],
  growthExemptUserIds?: ReadonlySet<string>
): InvariantViolation[] {
  return [
    ...detectNegativeCapital(sessions),
    ...detectExtremeGrowth(sessions, EXTREME_GROWTH_MULTIPLIER, growthExemptUserIds),
    ...detectNegativePositions(positions),
  ];
}
