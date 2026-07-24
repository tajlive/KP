import { describe, expect, it } from "vitest";
import { getDisplayUsdtToNokRate, nokPriceToUsdt, usdtPriceToNok } from "../nok";

describe("market/nok", () => {
  it("uses fallback rate when public env is missing", () => {
    delete process.env.NEXT_PUBLIC_USDT_NOK_RATE;
    expect(getDisplayUsdtToNokRate()).toBe(9.61);
  });

  it("konverterer USDT-pris til NOK med rate", () => {
    expect(usdtPriceToNok(63258, 10)).toBe(632580);
  });

  it("konverterer NOK-pris tilbake til USDT med rate", () => {
    expect(nokPriceToUsdt(632580, 10)).toBe(63258);
  });

  it("rejects invalid env rate", () => {
    process.env.NEXT_PUBLIC_USDT_NOK_RATE = "0";
    expect(getDisplayUsdtToNokRate()).toBe(9.61);
  });
});
