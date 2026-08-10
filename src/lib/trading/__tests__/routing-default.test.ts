import { describe, expect, it } from "vitest";
import {
  isGridDefaultRouting,
  resolveAutoConfigStrategy,
  resolveDefaultStrategyId,
} from "../routing-default";

/**
 * Ruting (2026-08-10): mode=pilot → simple_grid (COMBO E3, backtest-bevis).
 * mode=auto → grid (uendret for eksisterende auto-brukere).
 * gridDefault=false → gammel oppførsel (uendret).
 */

describe("resolveDefaultStrategyId (strategy_id for trading_sessions)", () => {
  it("gridDefault=true + mode=auto → grid", () => {
    expect(resolveDefaultStrategyId("auto", true)).toBe("grid");
  });

  it("gridDefault=true + mode=pilot → simple_grid (Pilot COMBO E3)", () => {
    expect(resolveDefaultStrategyId("pilot", true)).toBe("simple_grid");
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

  it("flagget default (udefinert) → auto=grid, pilot=simple_grid", () => {
    expect(resolveDefaultStrategyId("auto", isGridDefaultRouting({}))).toBe("grid");
    expect(resolveDefaultStrategyId("pilot", isGridDefaultRouting(undefined))).toBe("simple_grid");
  });
});

describe("resolveAutoConfigStrategy (strategy i auto_trading_configs-upsert)", () => {
  it("gridDefault=true → auto=grid, pilot=simple_grid", () => {
    expect(resolveAutoConfigStrategy("auto", true)).toBe("grid");
    expect(resolveAutoConfigStrategy("pilot", true)).toBe("simple_grid");
  });

  it("gridDefault=false + mode=auto → multi_signal (gammel oppførsel)", () => {
    expect(resolveAutoConfigStrategy("auto", false)).toBe("multi_signal");
  });

  it("gridDefault=false + mode=pilot → grid (gammel oppførsel)", () => {
    expect(resolveAutoConfigStrategy("pilot", false)).toBe("grid");
  });
});
