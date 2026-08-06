import { describe, expect, it } from "vitest";
import { BRAND, CDS_THEME_MAP, MOBILE, MOTION, RADIUS, SHADOW } from "../tokens";

describe("design tokens", () => {
  it("BRAND exposes Tailwind utility mappings", () => {
    expect(BRAND.primary).toBe("bg-brand-500 hover:bg-brand-600 text-white");
    expect(BRAND.danger).toContain("bg-red-600");
  });

  it("RADIUS provides consistent rounding", () => {
    expect(RADIUS.button).toBe("rounded-xl");
    expect(RADIUS.card).toBe("rounded-2xl");
    expect(RADIUS.input).toBe("rounded-lg");
    expect(RADIUS.badge).toBe("rounded-full");
  });

  it("SHADOW provides elevation utilities", () => {
    expect(SHADOW.cardBrand).toBe("shadow-lg shadow-brand-500/10");
    expect(SHADOW.modal).toBe("shadow-2xl");
  });

  it("MOTION provides easing curves", () => {
    expect(MOTION.easeOut).toEqual([0.25, 0.46, 0.45, 0.94]);
    expect(MOTION.pageDuration).toBe(0.35);
  });

  it("MOBILE enforces WCAG touch targets", () => {
    expect(MOBILE.touchTarget).toBe("min-h-[44px] min-w-[44px]");
  });

  it("CDS_THEME_MAP binds CDS components to CSS variables", () => {
    expect(CDS_THEME_MAP.primary).toBe("var(--cds-colors-interactive)");
  });
});
