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

    it("returnerer BUY når pris er i grid og empty nivå finnes under", () => {
      const levels = generateGridLevels(baseConfig);
      // Pris 101000 — i grid, nivå 5 (buy=100000) er empty og under prisen → BUY
      const signal = evaluateGridSignal(baseConfig, levels, 101000);
      expect(signal.action).toBe("buy");
      expect(signal.level?.level).toBe(5);
      expect(signal.level?.buyPrice).toBe(100000);
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

  describe("evaluateGridSignal — extended (2026-08-02 fixes)", () => {
    it("selger DCA-nivå via trailing når pris ≥ buyPrice*1.02", () => {
      const levels = generateGridLevels(baseConfig);
      // Legg til et kjøpt DCA-nivå (kjøpt lavt, skal selges ved recovery)
      levels.push({
        level: -1, buyPrice: 80000, sellPrice: 90000,
        quantity: 0.015, status: "bought", dcaLevel: 1, sizeMultiplier: 1.0,
      });
      // Pris 87000 ≥ trailing threshold 80000*1.02=81600 → trailing sell
      const signal = evaluateGridSignal(baseConfig, levels, 87000);
      expect(signal.action).toBe("sell");
      expect(signal.level?.dcaLevel).toBe(1);
      expect(signal.sellType).toBe("trailing");
      expect(signal.expectedProfitPct).toBeGreaterThan(5); // (87000-80000)/80000 = 8.75%
    });

    it("trailing tar alltid presedens over fast sell (buyPrice*1.02 < sellPrice for alle reelle spread)", () => {
      const levels = generateGridLevels(baseConfig);
      levels.push({
        level: -1, buyPrice: 85000, sellPrice: 90000,
        quantity: 0.012, status: "bought", dcaLevel: 2, sizeMultiplier: 1.5,
      });
      // Trailing threshold = 85000*1.02 = 86700. sellPrice = 90000.
      // 86700 < 90000 → trailing alltid trigget før fast sell. Design: trailing dominerer.
      const signal = evaluateGridSignal(baseConfig, levels, 86800);
      expect(signal.action).toBe("sell");
      expect(signal.sellType).toBe("trailing");
    });

    it("selger kjøpt celle langt under dagens pris (ikke bare cell og cell-1)", () => {
      const levels = generateGridLevels(baseConfig);
      // Nivå 0 kjøpt på 90000. Prisen er oppe på nivå 5 (100000).
      levels[0].status = "bought";
      // Før: kun cell og cellIndex-1 ble sjekket → nivå 0 (5 steg unna) ble ignorert.
      // Nå: ALLE kjøpte celler sjekkes → nivå 0 sin trailing threshold 90000*1.02=91800.
      // Pris 100000 ≥ 91800 → trailing sell
      const signal = evaluateGridSignal(baseConfig, levels, 100000);
      expect(signal.action).toBe("sell");
      expect(signal.level?.level).toBe(0);
      expect(signal.expectedProfitPct).toBeGreaterThan(10); // (100000-90000)/90000 = 11.1%
    });

    it("hopper over DCA-nivå som allerede er kjøpt (status=bought)", () => {
      const levels = generateGridLevels(baseConfig);
      // Simuler at DCA nivå 1 allerede er kjøpt og persistert
      levels.push({
        level: -1, buyPrice: 85500, sellPrice: 90000,
        quantity: 0.012, status: "bought", dcaLevel: 1, sizeMultiplier: 1.0,
      });
      // Pris 80000 ≤ 85500 (DCA nivå 1 trigger), men DCA 1 = bought → hopp til DCA 2
      const signal = evaluateGridSignal(baseConfig, levels, 80000);
      // DCA nivå 2: 90000*0.90=81000, 80000 ≤ 81000 → BUY nivå 2
      expect(signal.action).toBe("buy");
      expect(signal.level?.dcaLevel).toBe(2);
      expect(signal.level?.sizeMultiplier).toBe(1.5);
    });

    it("returnerer WAIT når alle DCA-nivåer er oppbrukt (alle tre kjøpt)", () => {
      const levels = generateGridLevels(baseConfig);
      levels.push(
        { level: -1, buyPrice: 85500, sellPrice: 90000, quantity: 0.012, status: "bought", dcaLevel: 1, sizeMultiplier: 1.0 },
        { level: -1, buyPrice: 81000, sellPrice: 90000, quantity: 0.015, status: "bought", dcaLevel: 2, sizeMultiplier: 1.5 },
        { level: -1, buyPrice: 76500, sellPrice: 90000, quantity: 0.020, status: "bought", dcaLevel: 3, sizeMultiplier: 2.0 },
      );
      const signal = evaluateGridSignal(baseConfig, levels, 70000);
      expect(signal.action).toBe("wait");
      expect(signal.reason).toContain("alle 3 DCA-nivåer");
    });
  });

  describe("generateGridLevels — sizeMultiplier", () => {
    it("setter sizeMultiplier på DCA-nivåer fra evaluateGridSignal", () => {
      const levels = generateGridLevels(baseConfig);
      const signal = evaluateGridSignal(baseConfig, levels, 80000); // DCA nivå 1
      expect(signal.action).toBe("buy");
      expect(signal.level?.sizeMultiplier).toBe(1.0); // DCA nivå 1
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
