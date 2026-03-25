import { describe, expect, it } from "vitest";
import { maxActiveTradingSessions } from "./session-limits";

describe("maxActiveTradingSessions", () => {
  it("student paper: 1 aktiv sesjon", () => {
    expect(maxActiveTradingSessions("student", "paper")).toBe(999);
  });

  it("student live: 0 (ingen live uten betalt)", () => {
    expect(maxActiveTradingSessions("student", "live")).toBe(0);
  });

  it("bachelor paper: mange (ubegrenset i praksis)", () => {
    expect(maxActiveTradingSessions("bachelor", "paper")).toBe(999);
  });

  it("bachelor live: 3 strategier", () => {
    expect(maxActiveTradingSessions("bachelor", "live")).toBe(3);
  });

  it("master live: 7 strategier", () => {
    expect(maxActiveTradingSessions("master", "live")).toBe(7);
  });

  it("phd live: ubegrenset i praksis", () => {
    expect(maxActiveTradingSessions("phd", "live")).toBe(999);
  });
});
