/**
 * Valuta-hygiene for posisjonsdata (inflasjonsfiks 2026-07-27).
 *
 * Bakgrunn: paper-trades lagres NOK-denominert (trades.price = fill-USDT ×
 * usdt_nok_rate), og DB-triggeren kopierer NEW.price rett inn i
 * trading_sessions.open_position. Candles/markedsdata er derimot USDT.
 * Når exit-logikk (trailing-TP, delvis TP, tids-exit) sammenligner
 * NOK-posisjoner mot USDT-priser, oppstår falske salgssignaler — og i
 * kombinasjon med salg uten beholdning, pengemengde-inflasjon
 * (prod-bevis: sesjon 100 000 → 1 485 074 NOK på 7,5 timer).
 *
 * RENE funksjoner — brukes både i tick-route (les-siden) og ved
 * orphan-adopsjon (skriv-siden), og kan testes isolert.
 */

/** Posisjons-shape slik den lagres i trading_sessions.open_position. */
export interface StoredPositionLike {
  side?: string;
  quantity?: number;
  entry_price?: number;
  entry_time?: string;
  highest_price?: number;
  lots?: Array<{
    quantity?: number;
    entryPrice?: number;
    timestamp?: string;
  }>;
}

/**
 * Faktisk beholdning i base-enhet (BTC etc.) for en lagret posisjon.
 * Live/nyere posisjoner har FIFO-lots; trigger-skrevne paper-posisjoner
 * har kun `quantity`.
 */
export function getPositionBaseQuantity(
  openPosition: StoredPositionLike | null | undefined,
): number {
  if (!openPosition) return 0;
  if (Array.isArray(openPosition.lots) && openPosition.lots.length > 0) {
    return openPosition.lots.reduce(
      (sum, lot) => sum + (Number(lot?.quantity) || 0),
      0,
    );
  }
  const qty = Number(openPosition.quantity);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

/**
 * Terskel for valuta-deteksjon: NOK/USDT-rate er ~9–11, så et prisfelt
 * mer enn 2.5× over markedsprisen kan ikke være USDT-denominert — det
 * er NOK (eller korrupt). Begge tilfeller løses ved å dele på raten.
 */
export const PRICE_CURRENCY_MISMATCH_FACTOR = 2.5;

/**
 * Terskel for korrupt inngangspris: en posisjon hvis kostgrunnlag er
 * >90 % under dagens marked kan ikke være reell på en plattform der
 * paper-sesjoner lever i dager/uker — det er datarus (prod-bevis:
 * entry ~4,5k mot marked ~64,5k fra ødelagt pris-historikk).
 */
export const IMPLAUSIBLE_ENTRY_FACTOR = 0.1;

function normalizePriceValue(
  value: number | undefined,
  currentPriceUsdt: number,
  usdtNokRate: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return value;
  }
  if (
    currentPriceUsdt > 0 &&
    usdtNokRate > 1 &&
    value > currentPriceUsdt * PRICE_CURRENCY_MISMATCH_FACTOR
  ) {
    return value / usdtNokRate;
  }
  return value;
}

/**
 * Normaliser en posisjons prisfelt til USDT der de åpenbart er
 * NOK-denominerte (>2.5× markedspris). Returnerer NY posisjon —
 * muterer ikke input. Beholdning (quantity) røres aldri.
 */
export function normalizePositionPricesToUsdt<T extends StoredPositionLike>(
  position: T,
  currentPriceUsdt: number,
  usdtNokRate: number,
): T {
  if (!position) return position;
  const normalized: StoredPositionLike = {
    ...position,
    entry_price: normalizePriceValue(
      position.entry_price,
      currentPriceUsdt,
      usdtNokRate,
    ),
    highest_price: normalizePriceValue(
      position.highest_price,
      currentPriceUsdt,
      usdtNokRate,
    ),
    lots: Array.isArray(position.lots)
      ? position.lots.map((lot) => ({
          ...lot,
          entryPrice: normalizePriceValue(
            lot?.entryPrice,
            currentPriceUsdt,
            usdtNokRate,
          ),
        }))
      : position.lots,
  };
  return normalized as T;
}

/**
 * Er kostgrunnlaget plausibelt mot dagens marked? false = datarus som
 * ikke skal adopteres eller brukes til exit-logikk. Uten markedspris
 * kan vi ikke vurdere — da tillates posisjonen (legacy-oppførsel).
 */
export function isPositionEntryPlausible(
  entryPrice: number | undefined,
  currentPriceUsdt: number,
): boolean {
  if (!entryPrice || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    return false;
  }
  if (currentPriceUsdt <= 0) return true;
  return entryPrice >= currentPriceUsdt * IMPLAUSIBLE_ENTRY_FACTOR;
}
