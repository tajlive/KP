import { describe, it, expect } from "vitest";
import {
  generateGridLevels,
  evaluateGridSignal,
  calculateOptimalGrid,
  type GridConfig,
} from "../grid-strategy";

describe("Grid Trading Strategy", () => {
  const baseConfig: GridConfig = {
    symbol: "BTCUSDT",
    lowerPrice: 90000,
    upperPrice: 110000,
    gridLevels: 10,
    amountPerGrid: 1000,
    currentPrice: 100000,
  };

  describe("generateGridLevels", () => {
    it("genererer riktig antall nivåer", () => {
      const levels = generateGridLevels(baseConfig);
      expect(levels.length).toBe(10);
    });

    it("første nivå starter på lowerPrice", () => {
      const levels = generateGridLevels(baseConfig);
      expect(levels[0].buyPrice).toBe(90000);
      expect(levels[0].sellPrice).toBe(92000); // 90000 + (110000-90000)/10
    });

    it("siste nivå ender på upperPrice", () => {
      const levels = generateGridLevels(baseConfig);
      expect(levels[9].sellPrice).toBe(110000);
    });

    it("hvert nivå har riktig status", () => {
      const levels = generateGridLevels(baseConfig);
      levels.forEach(l => expect(l.status).toBe("empty"));
    });
  });

  describe("evaluateGridSignal", () => {
    it("returnerer BUY når pris faller til kjøpsnivå", () => {
      const levels = generateGridLevels(baseConfig);
      // Level 0: buy=90000. Pris 90000 ≤ 90000 → BUY (innenfor grid)
      const signal = evaluateGridSignal(baseConfig, levels, 90000);
      expect(signal.action).toBe("buy");
      expect(signal.level?.level).toBe(0);
    });

    it("returnerer SELL når pris stiger til salgsnivå for kjøpt posisjon", () => {
      const levels = generateGridLevels(baseConfig);
      levels[0].status = "bought"; // Kjøpt på nivå 0 (buy=90000, sell=92000)
      // Pris 92000 ≥ sellPrice(92000) → SELL (sjekkes FØR kjøp)
      const signal = evaluateGridSignal(baseConfig, levels, 92000);
      expect(signal.action).toBe("sell");
      expect(signal.level?.level).toBe(0);
      expect(signal.expectedProfitPct).toBeGreaterThan(0);
    });

    it("returnerer WAIT når pris er midt i grid", () => {
      const levels = generateGridLevels(baseConfig);
      // Pris 101000 — midt i grid, ingen nivå grens er truffet
      const signal = evaluateGridSignal(baseConfig, levels, 101000);
      expect(signal.action).toBe("wait");
    });

    it("returnerer DCA BUY når pris er under grid (DCA under bunn)", () => {
      const levels = generateGridLevels(baseConfig);
      // lowerPrice=90000, DCA nivå 1: 90000*0.95=85500, 80000 ≤ 85500 → BUY
      const signal = evaluateGridSignal(baseConfig, levels, 80000);
      expect(signal.action).toBe("buy");
      expect(signal.reason).toContain("DCA");
    });

    it("returnerer WAIT når pris er over grid", () => {
      const levels = generateGridLevels(baseConfig);
      const signal = evaluateGridSignal(baseConfig, levels, 120000);
      expect(signal.action).toBe("wait");
      expect(signal.reason).toContain("over grid");
    });
  });

  describe("calculateOptimalGrid", () => {
    it("høy volatilitet gir større intervall", () => {
      const lowVol = calculateOptimalGrid(100000, 2, 100000);
      const highVol = calculateOptimalGrid(100000, 10, 100000);
      expect(highVol.upperPrice - highVol.lowerPrice).toBeGreaterThan(
        lowVol.upperPrice - lowVol.lowerPrice
      );
    });

    it("høy volatilitet gir flere nivåer", () => {
      const lowVol = calculateOptimalGrid(100000, 2, 100000);
      const highVol = calculateOptimalGrid(100000, 10, 100000);
      expect(highVol.gridLevels).toBeGreaterThan(lowVol.gridLevels);
    });

    it("maks 10% av kapital per grid", () => {
      const grid = calculateOptimalGrid(100000, 5, 100000);
      expect(grid.amountPerGrid).toBeLessThanOrEqual(10000);
    });
  });
});
