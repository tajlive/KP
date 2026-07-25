/**
 * Engine-nivå signal-guard.
 *
 * Regel (produktkrav 2026-07-25): Avvis ALLE kjøpssignaler med
 * expectancy < 0 ELLER confidence = 0. Salg blokkeres aldri —
 * exits skal alltid gjennomføres.
 *
 * Bakgrunn: calculateDynamicPositionSize (position-size.ts) reduserte
 * tidligere bare posisjonsstørrelsen ved negativ expectancy — kjøpet
 * ble likevel gjennomført. Denne guard-en er den harde stopperen.
 */

export interface SignalGuardInput {
  action: "buy" | "sell" | "hold";
  /** 0–1. null/undefined = ingen data (f.eks. DCA-timerkjøp) — tillatt. */
  confidence?: number | null;
  /** Prosent. null/undefined = ingen data — tillatt. */
  expectancy?: number | null;
}

export interface SignalGuardResult {
  allowed: boolean;
  reason?: string;
}

export function evaluateSignalGuard(input: SignalGuardInput): SignalGuardResult {
  if (input.action !== "buy") {
    return { allowed: true };
  }

  if (input.confidence === 0) {
    return {
      allowed: false,
      reason: "Signal blokkert: confidence = 0 (modellen har ingen tillit til signalet)",
    };
  }

  if (input.expectancy !== null && input.expectancy !== undefined && input.expectancy < 0) {
    return {
      allowed: false,
      reason: `Signal blokkert: expectancy ${input.expectancy.toFixed(1)}% < 0 (forventet tap per trade)`,
    };
  }

  return { allowed: true };
}
