/**
 * Engine-nivå signal-guard — FORSTERKET 2026-07-27.
 *
 * REGEL 1: Avvis ALLE signaler (både kjøp og salg) med confidence = 0.
 *   Unntak: manuelle ordre, stop-loss, og take-profit.
 *
 * REGEL 2: Avvis kjøpssignaler med expectancy < 0.
 *
 * REGEL 3: Rate-limit salg: maks 1 auto-salg per symbol per 15 minutter.
 *   Forhindrer "time-based exit cascade" som skaper dusinvis av tapende salg.
 *
 * Bakgrunn: 2026-07-27 — 21 av 39 salg på Tomars konto ble utført med
 * confidence=0 via time-based exit, med totalt tap på -$1 399.
 */

export interface SignalGuardInput {
  action: "buy" | "sell" | "hold";
  /** 0–1. null/undefined = ingen data — tillatt. */
  confidence?: number | null;
  /** Prosent. null/undefined = ingen data — tillatt. */
  expectancy?: number | null;
  /** Hvorfor selger vi? "manual", "stop_loss", "take_profit", "time_exit", "auto" */
  exitReason?: string;
  /** Tid siden siste auto-salg for dette symbolet (ms). null = ingen tidligere salg. */
  msSinceLastAutoSell?: number | null;
}

export interface SignalGuardResult {
  allowed: boolean;
  reason?: string;
}

/** Hvor lenge må det gå mellom auto-salg for samme symbol */
const MIN_AUTO_SELL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutter

/** Exit-årsaker som ALLTID tillates (overstyrer confidence-sjekk) */
const ALWAYS_ALLOWED_EXITS = new Set([
  "manual",
  "stop_loss",
  "take_profit",
  "margin_call",
]);

export function evaluateSignalGuard(input: SignalGuardInput): SignalGuardResult {
  // Kjøp: blokker confidence=0 og negativ expectancy
  if (input.action === "buy") {
    if (input.confidence === 0) {
      return {
        allowed: false,
        reason: "KJØP blokkert: confidence = 0 (modellen har ingen tillit til signalet)",
      };
    }

    if (input.expectancy !== null && input.expectancy !== undefined && input.expectancy < 0) {
      return {
        allowed: false,
        reason: `KJØP blokkert: expectancy ${input.expectancy.toFixed(1)}% < 0 (forventet tap per trade)`,
      };
    }

    return { allowed: true };
  }

  // Salg: alltid tillat manuelle, stop-loss og take-profit
  if (input.exitReason && ALWAYS_ALLOWED_EXITS.has(input.exitReason)) {
    return { allowed: true };
  }

  // Salg: blokker confidence=0 for auto-exits (time-based, auto)
  if (input.confidence === 0) {
    return {
      allowed: false,
      reason: "SALG blokkert: confidence = 0 for auto-exit. Bruk manuelt salg eller vent på bedre signal.",
    };
  }

  // Salg: rate-limit — maks 1 auto-salg per 15 min per symbol
  if (
    input.msSinceLastAutoSell !== null &&
    input.msSinceLastAutoSell !== undefined &&
    input.msSinceLastAutoSell < MIN_AUTO_SELL_INTERVAL_MS
  ) {
    const waitMinutes = Math.ceil((MIN_AUTO_SELL_INTERVAL_MS - input.msSinceLastAutoSell) / 60000);
    return {
      allowed: false,
      reason: `SALG rate-limit: ${waitMinutes} min til neste auto-salg. Forhindrer exit-cascade.`,
    };
  }

  return { allowed: true };
}
