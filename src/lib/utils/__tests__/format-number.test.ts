import { describe, it, expect } from "vitest";
import { formatNumber, formatNumberFull, parseCompactNumber } from "../format-number";

describe("formatNumber", () => {
  describe("normal cases", () => {
    it("formats small numbers as-is", () => {
      expect(formatNumber(999)).toBe("999");
      expect(formatNumber(500)).toBe("500");
      expect(formatNumber(1)).toBe("1");
    });

    it("formats thousands with k suffix", () => {
      expect(formatNumber(1000)).toBe("1k");
      expect(formatNumber(1500)).toBe("1,5k");
      // 999_999 is formatted as "1 000k" with no-NO locale (uses narrow non-breaking space)
      expect(formatNumber(999_999)).toMatch(/1\s000k/);
    });

    it("formats millions with M suffix", () => {
      expect(formatNumber(1_000_000)).toBe("1M");
      expect(formatNumber(1_500_000)).toBe("1,5M");
      expect(formatNumber(15_000_000)).toBe("15M");
    });

    it("formats negative numbers correctly", () => {
      expect(formatNumber(-1500)).toBe("-1,5k");
      expect(formatNumber(-1_500_000)).toBe("-1,5M");
    });

    it("formats zero", () => {
      expect(formatNumber(0)).toBe("0");
    });

    it("respects decimals option", () => {
      expect(formatNumber(1550, { decimals: 0 })).toBe("2k");
      expect(formatNumber(1550, { decimals: 2 })).toBe("1,55k");
    });

    it("respects compact option for small numbers", () => {
      expect(formatNumber(500, { compact: true })).toBe("500");
    });
  });

  describe("edge cases — safety guards", () => {
    it("returns em-dash for null", () => {
      expect(formatNumber(null as unknown as number)).toBe("—");
    });

    it("returns em-dash for undefined", () => {
      expect(formatNumber(undefined as unknown as number)).toBe("—");
    });

    it("returns em-dash for NaN", () => {
      expect(formatNumber(NaN)).toBe("—");
    });

    it("returns em-dash for Infinity", () => {
      expect(formatNumber(Infinity)).toBe("—");
    });

    it("returns em-dash for -Infinity", () => {
      expect(formatNumber(-Infinity)).toBe("—");
    });
  });

  describe("boundary values", () => {
    it("handles exactly 1000 (k boundary)", () => {
      expect(formatNumber(1000)).toBe("1k");
    });

    it("handles exactly 1_000_000 (M boundary)", () => {
      expect(formatNumber(1_000_000)).toBe("1M");
    });

    it("handles very small positive numbers", () => {
      expect(formatNumber(0.001)).toBe("0,001");
    });

    it("handles very small negative numbers", () => {
      // no-NO locale uses minus sign (U+2212) not hyphen-minus
      expect(formatNumber(-0.001)).toMatch(/−0,001/);
    });
  });
});

describe("formatNumberFull", () => {
  it("formats with space thousands separator", () => {
    // no-NO locale uses narrow non-breaking space (U+202F) as thousands separator
    expect(formatNumberFull(100000)).toMatch(/100\s000/);
    expect(formatNumberFull(1_500_000)).toMatch(/1\s500\s000/);
  });

  it("returns em-dash for invalid values", () => {
    expect(formatNumberFull(null as unknown as number)).toBe("—");
    expect(formatNumberFull(undefined as unknown as number)).toBe("—");
    expect(formatNumberFull(NaN)).toBe("—");
    expect(formatNumberFull(Infinity)).toBe("—");
  });
});

describe("parseCompactNumber", () => {
  it("parses plain numbers", () => {
    expect(parseCompactNumber("100")).toBe(100);
    expect(parseCompactNumber("1000")).toBe(1000);
  });

  it("parses k suffix (Norwegian comma)", () => {
    expect(parseCompactNumber("10,2k")).toBe(10_200);
    expect(parseCompactNumber("100k")).toBe(100_000);
  });

  it("parses k suffix (English dot)", () => {
    expect(parseCompactNumber("10.2k")).toBe(10_200);
  });

  it("parses M suffix", () => {
    expect(parseCompactNumber("1.5M")).toBe(1_500_000);
    expect(parseCompactNumber("1,5M")).toBe(1_500_000);
  });

  it("returns null for invalid input", () => {
    expect(parseCompactNumber("abc")).toBeNull();
    expect(parseCompactNumber("")).toBeNull();
    expect(parseCompactNumber("   ")).toBeNull();
  });
});
