import { describe, expect, it } from "vitest";
import { ensureNokDenominated } from "../currency";

const RATE = 9.66;
const SOL_USDT = 73.82;

describe("ensureNokDenominated (skrivetids valuta-guard)", () => {
  it("konverterer ukonverterte USDT-verdier til NOK (prod-tilfellet SOL 2026-07-28)", () => {
    // Slik radene faktisk så ut i prod: pris/total/fee i USDT
    const result = ensureNokDenominated(
      { price: 73.82, totalValue: 761.18, fee: 1.52 },
      SOL_USDT,
      RATE,
    );
    expect(result.corrected).toBe(true);
    expect(result.reason).toBe("converted_usdt");
    expect(result.price).toBeCloseTo(73.82 * RATE, 4);
    expect(result.totalValue).toBeCloseTo(761.18 * RATE, 2);
    expect(result.fee).toBeCloseTo(1.52 * RATE, 4);
  });

  it("lar allerede-korrekte NOK-verdier stå uendret (normaltilfellet)", () => {
    const result = ensureNokDenominated(
      { price: 73.82 * RATE, totalValue: 761.18 * RATE, fee: 1.52 * RATE },
      SOL_USDT,
      RATE,
    );
    expect(result.corrected).toBe(false);
    expect(result.reason).toBe("already_nok");
    expect(result.price).toBeCloseTo(73.82 * RATE, 4);
  });

  it("fikser dobbeltkonverterte verdier ved å dele på raten", () => {
    const result = ensureNokDenominated(
      { price: 73.82 * RATE * RATE, totalValue: 761.18 * RATE * RATE, fee: 1.52 * RATE * RATE },
      SOL_USDT,
      RATE,
    );
    expect(result.corrected).toBe(true);
    expect(result.reason).toBe("fixed_double");
    expect(result.price).toBeCloseTo(73.82 * RATE, 4);
  });

  it("rører ikke verdier uten gyldig referanse eller rate", () => {
    const noRef = ensureNokDenominated({ price: 100, totalValue: 1000, fee: 1 }, 0, RATE);
    expect(noRef.corrected).toBe(false);
    expect(noRef.reason).toBe("unresolved");
    const noRate = ensureNokDenominated({ price: 100, totalValue: 1000, fee: 1 }, SOL_USDT, 0);
    expect(noRate.corrected).toBe(false);
  });

  it("lar uidentifiserbare outliers stå (unresolved) i stedet for å gjette", () => {
    // Pris langt under alle bånd — datarus vi ikke kan klassifisere
    const result = ensureNokDenominated(
      { price: 0.0001, totalValue: 5, fee: 0 },
      SOL_USDT,
      RATE,
    );
    expect(result.corrected).toBe(false);
    expect(result.reason).toBe("unresolved");
    expect(result.price).toBe(0.0001);
  });

  it("håndterer BTC-størrelser korrekt (høye tall, samme logikk)", () => {
    const BTC_USDT = 63452;
    const ok = ensureNokDenominated(
      { price: 613845, totalValue: 6138450, fee: 1227 },
      BTC_USDT,
      RATE,
    );
    expect(ok.reason).toBe("already_nok");
    expect(ok.corrected).toBe(false);
  });
});
