/**
 * Strategi-fallback: DCA (Dollar-Cost Averaging) når grid ikke produserer fills.
 *
 * Hvis ingen oppfyllinger på mer enn 24 timer, bytter autopiloten til DCA-modus:
 * - Gjør én liten kjøpsordre per tick (maks $10)
 * - På paret med minst gap mellom siste kjøpsnivå og nåpris
 * - Dette sikrer at kontoen ALLTID akkumulerer posisjoner, selv i døde markeder
 */

import type { PersistedGridOrder } from "./kraken-grid";

export interface FallbackCheckInput {
  /** Tidspunkt for siste fill (ISO 8601), eller null hvis aldri */
  lastFillAt: string | null;
  /** Totalt antall fills noensinne for denne brukeren */
  totalFills: number;
  /** Når ble autopiloten først aktivert (ISO 8601) — fallback hvis ingen fills enda */
  firstRunAt?: string | null;
  /** Antall timer uten fills før DCA utløses (default 24) */
  idleThresholdHours?: number;
}

export interface DcaOrder {
  pair: string;
  /** USDC-beløp å kjøpe for */
  amountUsdc: number;
  /** Volum i base-enhet */
  volume: string;
}

/**
 * Sjekk om autopiloten bør falle tilbake til DCA.
 *
 * Utløses når:
 * - Grid har 0 fills totalt, OG
 * - Mer enn 24 timer siden oppstart ELLER siste fill
 */
export function shouldFallbackToDCA(input: FallbackCheckInput): boolean {
  const { lastFillAt, totalFills, firstRunAt, idleThresholdHours = 24 } = input;

  // Hvis vi allerede har fills, fortsett med grid (den fungerer)
  if (totalFills > 0) return false;

  // Finn referansetid: siste fill, eller første oppstart
  const referenceTime = lastFillAt ?? firstRunAt;
  if (!referenceTime) return false;

  const msSince = Date.now() - new Date(referenceTime).getTime();
  const hoursSince = msSince / (3600 * 1000);

  return hoursSince > idleThresholdHours;
}

/**
 * Velg par for DCA-kjøp: paret der nåpris er NÆRMEST laveste kjøpsordre.
 * Dette er paret som er mest sannsynlig å få en fill snart — men i DCA-modus
 * tvinger vi et kjøp uansett.
 */
export function pickDcaPair(
  pairs: string[],
  gridLevels: Record<string, PersistedGridOrder[]>,
  prices: Record<string, number>,
): string | null {
  let best: { pair: string; gapPct: number } | null = null;

  for (const pair of pairs) {
    const priceNow = prices[pair];
    if (!priceNow || priceNow <= 0) continue;

    const buys = (gridLevels[pair] ?? []).filter(
      (o) => o.side === "buy" && o.status === "open",
    );

    if (buys.length === 0) continue;

    // Finn høyeste kjøpsordre (nærmest nåpris)
    const highest = Math.max(...buys.map((o) => o.price));
    const gapPct = (priceNow - highest) / priceNow;

    if (!best || gapPct < best.gapPct) {
      best = { pair, gapPct };
    }
  }

  return best?.pair ?? null;
}

/**
 * Beregn DCA-kjøpsordre: 10% av ledig USDC, maks $10.
 */
export function computeDcaOrder(
  pair: string,
  currentPrice: number,
  freeUsdc: number,
  maxUsdc: number = 10,
  fraction: number = 0.1,
): DcaOrder | null {
  if (currentPrice <= 0 || freeUsdc < 5) return null;

  const amount = Math.min(freeUsdc * fraction, maxUsdc);
  if (amount < 5) return null; // minimum $5 for at det gir mening

  // Volum i base-enhet, med 8 desimaler
  const volume = (amount / currentPrice).toFixed(8);

  return {
    pair,
    amountUsdc: Math.round(amount * 100) / 100,
    volume,
  };
}
