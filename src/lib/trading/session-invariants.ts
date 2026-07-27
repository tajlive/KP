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
 */
export function detectExtremeGrowth(
  sessions: SessionCapitalRow[],
  multiplier: number = EXTREME_GROWTH_MULTIPLIER
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const s of sessions) {
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

/** Kjør alle invariant-sjekker og returnér samlet liste. */
export function checkAllInvariants(
  sessions: SessionCapitalRow[],
  positions: PositionQuantityRow[]
): InvariantViolation[] {
  return [
    ...detectNegativeCapital(sessions),
    ...detectExtremeGrowth(sessions),
    ...detectNegativePositions(positions),
  ];
}
