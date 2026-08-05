/**
 * Tester for kraken-grid-config.mjs (Task 4, plan 2026-08-05).
 * Fill-fysikk-regelen: spacing >= 2 x taker-fee x 1.9 ≈ 1.0 %.
 */
import { describe, it, expect } from "vitest";
import {
  PAIR_CFG,
  ACTIVE_PAIRS,
  TRAIL_SELL_PCT,
  MIN_LEVEL_USDC,
  MAX_OPEN_ORDERS,
  IDLE_THRESHOLD,
  spacingOk,
  invalidSpacingPairs,
} from "../kraken-grid-config.mjs";

describe("kraken-grid-config", () => {
  it("har XBT/ETH/SOL aktive (live-par)", () => {
    expect(ACTIVE_PAIRS()).toEqual(["XBTUSDC", "ETHUSDC", "SOLUSDC"]);
  });

  it("har ADA/DOT i konfigurasjon men IKKE aktive ennå (Task 3-univers)", () => {
    expect(PAIR_CFG.ADAUSDC).toBeDefined();
    expect(PAIR_CFG.DOTUSDC).toBeDefined();
    expect(PAIR_CFG.ADAUSDC.active).toBe(false);
    expect(PAIR_CFG.DOTUSDC.active).toBe(false);
  });

  it("alle aktive par har spacing >= 1.0% (fill-fysikk-regelen)", () => {
    const bad = invalidSpacingPairs();
    expect(bad).toEqual([]);
    for (const [pair, cfg] of Object.entries(PAIR_CFG)) {
      if (cfg.active) {
        expect(cfg.spacing, `${pair} spacing`).toBeGreaterThanOrEqual(0.01);
      }
    }
  });

  it("spacingOk avviser for tett spacing (fee-økonomi spiser fortjenesten)", () => {
    expect(spacingOk(0.008)).toBe(false); // 0.8% — under 1.0%-grensen
    expect(spacingOk(0.010)).toBe(true); // 1.0% — akkurat på grensen
    expect(spacingOk(0.012)).toBe(true); // 1.2% — god margin
  });

  it("konstanter er fornuftige for Toms grid-størrelse", () => {
    expect(TRAIL_SELL_PCT).toBe(1.02);
    expect(MIN_LEVEL_USDC).toBeGreaterThanOrEqual(8);
    expect(MAX_OPEN_ORDERS).toBeGreaterThanOrEqual(20);
    expect(IDLE_THRESHOLD).toBeGreaterThanOrEqual(25);
  });

  it("alle par har nødvendige felter med riktige typer", () => {
    for (const [pair, cfg] of Object.entries(PAIR_CFG)) {
      expect(pair.endsWith("USDC")).toBe(true);
      expect(typeof cfg.dec).toBe("number");
      expect(typeof cfg.ordremin).toBe("number");
      expect(typeof cfg.spacing).toBe("number");
      expect(typeof cfg.active).toBe("boolean");
      expect(typeof cfg.asset).toBe("string");
    }
  });

  it("asset-mapping matcher Kraken-balansenøkler (legacy-prefiks for XBT/ETH)", () => {
    expect(PAIR_CFG.XBTUSDC.asset).toBe("XXBT");
    expect(PAIR_CFG.ETHUSDC.asset).toBe("XETH");
    expect(PAIR_CFG.SOLUSDC.asset).toBe("SOL");
    expect(PAIR_CFG.ADAUSDC.asset).toBe("ADA");
    expect(PAIR_CFG.DOTUSDC.asset).toBe("DOT");
  });

  it("kill-switch-equity dekker ALLE 5 par når de aktiveres (Task 5)", () => {
    // equityUsdc-beregning i manageren summerer bal[asset] x pris per par;
    // asset-feltet finnes for alle — ingen par kan bli usynlig for kill-sjekken
    for (const [pair, cfg] of Object.entries(PAIR_CFG)) {
      expect(cfg.asset.length, `${pair} asset`).toBeGreaterThan(0);
    }
  });
});
