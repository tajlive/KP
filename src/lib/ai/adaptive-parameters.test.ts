/**
 * Tester for adaptive-parameters.ts - AI MVP Testplan
 */

import { describe, it, expect } from "vitest";
import {
  getInitialParameters,
  calculateAdaptiveAdjustments,
  type StrategyParameters,
} from "./adaptive-parameters";

describe("adaptive-parameters", () => {
  describe("getInitialParameters", () => {
    it("should return DCA parameters for dca_trygg", () => {
      const params = getInitialParameters("dca_trygg");
      expect(params.dcaInterval).toBe(168); // 1 uke
      expect(params.maxPositionSize).toBe(10);
    });

    it("should return trend parameters for trend_balansert", () => {
      const params = getInitialParameters("trend_balansert");
      expect(params.dcaInterval).toBe(24); // 1 dag
      expect(params.maxPositionSize).toBe(15);
    });

    it("should return grid parameters for grid_bot", () => {
      const params = getInitialParameters("grid_bot");
      expect(params.dcaInterval).toBe(1); // 1 time
      expect(params.maxPositionSize).toBe(25);
    });

    it("should default to dca_trygg for unknown strategy", () => {
      const params = getInitialParameters("unknown_strategy");
      expect(params.dcaInterval).toBe(168);
    });
  });

  describe("Parameter structure", () => {
    it("should have all required parameters", () => {
      const params = getInitialParameters("dca_trygg");
      
      expect(params).toHaveProperty("dcaInterval");
      expect(params).toHaveProperty("dcaAmount");
      expect(params).toHaveProperty("dcaMultiplier");
      expect(params).toHaveProperty("maxPositionSize");
      expect(params).toHaveProperty("stopLossPercent");
      expect(params).toHaveProperty("takeProfitPercent");
      expect(params).toHaveProperty("minConfidence");
      expect(params).toHaveProperty("volatilityThreshold");
    });

    it("should have valid parameter ranges", () => {
      const params = getInitialParameters("dca_trygg");
      
      expect(params.dcaInterval).toBeGreaterThan(0);
      expect(params.dcaAmount).toBeGreaterThan(0);
      expect(params.maxPositionSize).toBeGreaterThan(0);
      expect(params.maxPositionSize).toBeLessThanOrEqual(100);
      expect(params.stopLossPercent).toBeGreaterThan(0);
      expect(params.minConfidence).toBeGreaterThanOrEqual(0);
      expect(params.minConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Strategy differences", () => {
    it("should have shorter intervals for more active strategies", () => {
      const dca = getInitialParameters("dca_trygg");
      const multi = getInitialParameters("multisignal_aktiv");
      const grid = getInitialParameters("grid_bot");

      expect(dca.dcaInterval).toBeGreaterThan(multi.dcaInterval);
      expect(multi.dcaInterval).toBeGreaterThan(grid.dcaInterval);
    });

    it("should have larger position sizes for riskier strategies", () => {
      const dca = getInitialParameters("dca_trygg");
      const grid = getInitialParameters("grid_bot");

      expect(grid.maxPositionSize).toBeGreaterThan(dca.maxPositionSize);
    });

    it("should have tighter stop-losses for active strategies", () => {
      const dca = getInitialParameters("dca_trygg");
      const multi = getInitialParameters("multisignal_aktiv");

      expect(multi.stopLossPercent).toBeLessThan(dca.stopLossPercent);
    });
  });
});
