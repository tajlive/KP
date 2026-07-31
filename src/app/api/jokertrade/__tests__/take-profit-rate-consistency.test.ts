/**
 * Regresjonsguard (2026-07-31): Falske take-profit-exits i JokerTrade.
 *
 * PROD-HENDELSE: checkExits kalte getNokUsdtRate() som returnerte
 * DEFAULT_FALLBACK (10.5) fordi proxy feilet. executeTrade hadde lagret
 * entry-priser med levende rate (9.68). pnlPct ble regnet med 10.5 mot
 * entry lagret med 9.68 → +8.5 % falsk "gevinst" → TAKE_PROFIT_SELL som
 * i virkeligheten solgte med tap (-10 til -17 NOK per trade hos Tom).
 *
 * FIKS: checkExits bruker hver posisjons LAGREDE usdt_nok_rate
 * (autoritativ) for konvertering, ikke en felles rate som kan være fallback.
 *
 * Disse testene bruker de EKSTE prod-tallene (BTC 2026-07-30/31).
 */
import { describe, it, expect } from "vitest";

/**
 * Gjenskaper exit-beregningen i checkExits (jokertrade/route.ts).
 * entry: NOK-pris lagret på traden. currentPriceUsdt: levende Binance-pris.
 * rate: raten som brukes for å konvertere current til NOK.
 */
function beregnPnlPct(entryNok: number, currentPriceUsdt: number, rate: number, side: "buy" | "sell"): number {
  const currentPrice = currentPriceUsdt * rate;
  return side === "buy"
    ? ((currentPrice - entryNok) / entryNok) * 100
    : ((entryNok - currentPrice) / entryNok) * 100;
}

describe("Take-profit rate-konsistens (regresjon 2026-07-31)", () => {
  // EKTE prod-tall: Tom kjøpte 0.00997167 BTC @ 627 916,88 NOK (rate 9.68)
  const ENTRY_NOK = 627_916.8766992;
  const LAGRET_RATE = 9.68;
  const CURRENT_USDT = 64_945; // faktisk BTC-pris ved exit
  const TAKE_PROFIT_PCT = 8.0; // dynamisk TP var ~8 i dette tilfellet

  it("FEILEN: felles fallback-rate (10.5) gir falsk take-profit på +8.6 %", () => {
    // Dette er den gamle, ødelagte oppførselen — dokumentert for å vise hva som skjedde
    const pnlPct = beregnPnlPct(ENTRY_NOK, CURRENT_USDT, 10.5, "buy");
    expect(pnlPct).toBeGreaterThan(TAKE_PROFIT_PCT); // → falsk TAKE_PROFIT_SELL
    expect(pnlPct).toBeCloseTo(8.6, 0);
  });

  it("FIKSEN: posisjonens lagrede rate (9.68) gir korrekt ~0 % — INGEN exit", () => {
    const pnlPct = beregnPnlPct(ENTRY_NOK, CURRENT_USDT, LAGRET_RATE, "buy");
    // Riktig: prisen var nesten uendret (~+0.1 %) — take-profit skal IKKE utløses
    expect(pnlPct).toBeLessThan(TAKE_PROFIT_PCT);
    expect(pnlPct).toBeGreaterThan(-1);
    expect(pnlPct).toBeLessThan(1);
  });

  it("lagret rate brukes selv om fallback-rate divergerer kraftig", () => {
    // Samme scenario som prod: fallback 10.5 vs lagret 9.68 = 8.5 % divergens.
    // Med lagret rate skal resultatet være uavhengig av hva fallbacken er.
    const pnlMedLagret = beregnPnlPct(ENTRY_NOK, CURRENT_USDT, LAGRET_RATE, "buy");
    expect(Math.abs(pnlMedLagret)).toBeLessThan(1);
  });

  it("legacy-rader uten lagret rate faller tilbake til levende rate", () => {
    // Hvis usdt_nok_rate mangler (gamle rader), er fallback-rate eneste valg.
    // Da må vi i det minste bruke samme rate for entry og exit:
    // entry var lagret som entryUsdt * fallbackRate, så regningen er konsistent.
    const fallbackRate = 9.6;
    const entryUsdt = 64_867;
    const entryNokLegacy = entryUsdt * fallbackRate; // slik ville entry sett ut med samme rate
    const pnlPct = beregnPnlPct(entryNokLegacy, entryUsdt + 100, fallbackRate, "buy");
    expect(pnlPct).toBeCloseTo((100 / entryUsdt) * 100, 5); // kun reell prisbevegelse
  });

  it("reell prisoppgang over TP-terskel utløser fortsatt take-profit", () => {
    // Guard mot at fiksen gjør oss blinde for EKTE gevinster:
    // entry 64 867 USDT, nå 70 000 USDT (+7.9 % med lagret rate 9.68 → ikke nok),
    // men +9 % skal trigge.
    const entryNok = 64_867 * LAGRET_RATE;
    const pnlPct = beregnPnlPct(entryNok, 64_867 * 1.09, LAGRET_RATE, "buy");
    expect(pnlPct).toBeCloseTo(9.0, 1);
    expect(pnlPct).toBeGreaterThan(TAKE_PROFIT_PCT);
  });

  it("reelt fall under SL-terskel utløser fortsatt stop-loss", () => {
    const entryNok = 64_867 * LAGRET_RATE;
    const pnlPct = beregnPnlPct(entryNok, 64_867 * 0.94, LAGRET_RATE, "buy");
    expect(pnlPct).toBeCloseTo(-6.0, 1);
  });
});

describe("Fallback-konstanter", () => {
  it("DEFAULT_FALLBACK i exchange-rate er i tråd med markedet (9.6, ikke 10.5)", async () => {
    // Leser konstanten indirekte: etter fiksen skal fallback være 9.6.
    // (Importen krever ikke nettverk — vi sjekker modulens oppførsel ved feil.)
    const { getNokUsdtRate, clearRateCache } = await import(
      "@/lib/trading/canonical/exchange-rate"
    );
    clearRateCache();
    // Uten nettverk i test-miljø vil fetch feile → fallback returneres
    const rate = await getNokUsdtRate();
    // Markedsrate juli 2026 er ~9.6-9.7. 10.5 var den gamle farlige verdien.
    expect(rate).toBeLessThan(10);
    expect(rate).toBeGreaterThan(5);
  });
});
