import { describe, it, expect } from "vitest";
import { maxActiveTradingSessions } from "../session-limits";

describe("maxActiveTradingSessions", () => {
  describe("paper mode", () => {
    it("returns 999 for unlimited paper strategies (student)", () => {
      expect(maxActiveTradingSessions("student", "paper")).toBe(999);
    });

    it("returns 999 for unlimited paper strategies (bachelor)", () => {
      expect(maxActiveTradingSessions("bachelor", "paper")).toBe(999);
    });

    it("handles null tier as student (default)", () => {
      expect(maxActiveTradingSessions(null, "paper")).toBe(999);
    });

    it("handles undefined tier as student (default)", () => {
      expect(maxActiveTradingSessions(undefined, "paper")).toBe(999);
    });
  });

  describe("live mode", () => {
    it("returns 0 for student tier (live blocked)", () => {
      expect(maxActiveTradingSessions("student", "live")).toBe(0);
    });

    it("returns 3 for bachelor tier", () => {
      expect(maxActiveTradingSessions("bachelor", "live")).toBe(3);
    });

    it("returns 7 for master tier", () => {
      expect(maxActiveTradingSessions("master", "live")).toBe(7);
    });

    it("returns 999 for unlimited tiers (phd)", () => {
      expect(maxActiveTradingSessions("phd", "live")).toBe(999);
    });

    it("returns 999 for unlimited tiers (professor)", () => {
      expect(maxActiveTradingSessions("professor", "live")).toBe(999);
    });

    it("handles null tier as student (default, live blocked)", () => {
      expect(maxActiveTradingSessions(null, "live")).toBe(0);
    });
  });
});
