import { describe, expect, it } from "vitest";
import {
  isGridDefaultRouting,
  resolveAutoConfigStrategy,
  resolveDefaultStrategyId,
} from "../routing-default";

describe("resolveDefaultStrategyId (strategy_id for trading_sessions)", () => {
  it("gridDefault=true + mode=auto → grid", () => {
    expect(resolveDefaultStrategyId("auto", true)).toBe("grid");
  });

  it("gridDefault=true + mode=pilot → grid", () => {
    expect(resolveDefaultStrategyId("pilot", true)).toBe("grid");
  });

  it("gridDefault=false + mode=auto → multi_signal (gammel oppførsel)", () => {
    expect(resolveDefaultStrategyId("auto", false)).toBe("multi_signal");
  });

  it("gridDefault=false + mode=pilot → cryptopilot (gammel oppførsel)", () => {
    expect(resolveDefaultStrategyId("pilot", false)).toBe("cryptopilot");
  });
});

describe("isGridDefaultRouting (GRID_DEFAULT_ROUTING-flagget)", () => {
  it("flagget udefinert → grid default (on)", () => {
    expect(isGridDefaultRouting({})).toBe(true);
    expect(isGridDefaultRouting(undefined)).toBe(true);
  });

  it("GRID_DEFAULT_ROUTING=off → gammel oppførsel (off)", () => {
    expect(isGridDefaultRouting({ GRID_DEFAULT_ROUTING: "off" })).toBe(false);
  });

  it("GRID_DEFAULT_ROUTING=on → grid (on)", () => {
    expect(isGridDefaultRouting({ GRID_DEFAULT_ROUTING: "on" })).toBe(true);
  });

  it("annen verdi enn 'off' → grid (on)", () => {
    expect(isGridDefaultRouting({ GRID_DEFAULT_ROUTING: "1" })).toBe(true);
  });

  it("flagget default (udefinert) → grid for begge modes", () => {
    expect(resolveDefaultStrategyId("auto", isGridDefaultRouting({}))).toBe("grid");
    expect(resolveDefaultStrategyId("pilot", isGridDefaultRouting(undefined))).toBe("grid");
  });
});

describe("resolveAutoConfigStrategy (strategy i auto_trading_configs-upsert)", () => {
  it("gridDefault=true → grid for begge modes", () => {
    expect(resolveAutoConfigStrategy("auto", true)).toBe("grid");
    expect(resolveAutoConfigStrategy("pilot", true)).toBe("grid");
  });

  it("gridDefault=false + mode=auto → multi_signal (gammel oppførsel)", () => {
    expect(resolveAutoConfigStrategy("auto", false)).toBe("multi_signal");
  });

  it("gridDefault=false + mode=pilot → grid (gammel oppførsel)", () => {
    expect(resolveAutoConfigStrategy("pilot", false)).toBe("grid");
  });
});
