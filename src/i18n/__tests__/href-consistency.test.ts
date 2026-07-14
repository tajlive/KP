/**
 * Verifiserer at hrefWithLocale er konsistent med routing.config.
 *
 * Hvis routing.config endrer localePrefix, ma hrefWithLocale oppdateres.
 * Denne testen fanger opp mismatch.
 */

import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing.config";
import { hrefWithLocale } from "@/i18n/href-with-locale";

describe("hrefWithLocale vs routing.config", () => {
  const { localePrefix, locales, defaultLocale } = routing;

  it("localePrefix er 'always'", () => {
    expect(localePrefix).toBe("always");
  });

  it("default locale (no) far /no/ prefix", () => {
    // Med localePrefix=always skal ogsa default locale ha prefix
    for (const locale of locales) {
      const result = hrefWithLocale(locale, "/dashboard");
      expect(
        result,
        `Forventet /${locale}/dashboard, fikk ${result}`,
      ).toBe(`/${locale}/dashboard`);
    }
  });

  it("rot-sti far locale-prefix", () => {
    for (const locale of locales) {
      expect(hrefWithLocale(locale, "/")).toBe(`/${locale}`);
    }
  });

  it("alle stottede locales far prefix", () => {
    for (const locale of locales) {
      for (const path of ["/", "/dashboard", "/login", "/handel", "/priser"]) {
        const result = hrefWithLocale(locale, path);
        expect(result).toBe(`/${locale}${path === "/" ? "" : path}`);
      }
    }
  });
});
