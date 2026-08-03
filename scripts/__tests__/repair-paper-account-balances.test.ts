import { describe, it, expect } from "vitest";
import { calculateCorrectBalance, shouldRepair } from "../repair-paper-account-balances";

describe("calculateCorrectBalance", () => {
  it("beregner korrekt balance fra sesjoner (cash + posisjonsverdi)", () => {
    const sessions = [
      { current_capital_nok: 9000, open_position: { quantity: 0.01, entry_price: 600000 }, trading_pair: "BTCUSDT" },
      { current_capital_nok: 9500, open_position: null, trading_pair: "BTCUSDT" },
    ];
    const coinPrices = { BTCUSDT: 602000 };

    const result = calculateCorrectBalance(sessions, coinPrices);

    // 9000 cash + (0.01 * 602000) posisjonsverdi + 9500 cash = 24 520
    expect(result).toBe(24520);
  });

  it("normaliserer trading_pair med skråstrek (BTC/USDT → BTCUSDT) mot coin_prices", () => {
    const sessions = [
      { current_capital_nok: 10000, open_position: { quantity: 0.01, entry_price: 600000 }, trading_pair: "BTC/USDT" },
    ];
    const coinPrices = { BTCUSDT: 602000 };

    expect(calculateCorrectBalance(sessions, coinPrices)).toBe(16020);
  });

  it("faller tilbake til entry_price når coin-pris mangler", () => {
    const sessions = [
      { current_capital_nok: 10000, open_position: { quantity: 2, entry_price: 50 }, trading_pair: "XKCDUSDT" },
    ];

    expect(calculateCorrectBalance(sessions, {})).toBe(10100);
  });

  it("håndterer numeriske verdier som strenger (Postgres NUMERIC → JSON-streng)", () => {
    const sessions = [
      { current_capital_nok: "9000", open_position: { quantity: "0.01", entry_price: "600000" }, trading_pair: "BTCUSDT" },
    ];

    expect(calculateCorrectBalance(sessions, { BTCUSDT: "602000" })).toBe(15020);
  });

  it("ignorerer sesjoner uten åpen posisjon og teller kun cash", () => {
    const sessions = [
      { current_capital_nok: 1234.5, open_position: null, trading_pair: "BTCUSDT" },
    ];

    expect(calculateCorrectBalance(sessions, { BTCUSDT: 602000 })).toBe(1234.5);
  });
});

describe("shouldRepair", () => {
  it("returnerer true når avviket overstiger 100 NOK", () => {
    expect(shouldRepair(64221, 105604)).toBe(true);
    expect(shouldRepair(64221, 64325.5)).toBe(true); // avvik 104.5 > 100
  });

  it("returnerer false når avviket er ≤ 100 NOK", () => {
    expect(shouldRepair(64221, 64221)).toBe(false);
    expect(shouldRepair(64221, 64320.99)).toBe(false); // avvik 99.99 ≤ 100
  });

  it("er symmetrisk — avviket er absolutt", () => {
    expect(shouldRepair(105604, 64221)).toBe(true); // |64221 - 105604| = 41383 > 100
  });
});
