/**
 * Tester for kanonisk symbolregister.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeSymbol,
  getCanonicalSymbolUniverse,
  getAllowedPairs,
  isCanonicalSymbol,
  type SymbolRiskProfile,
} from "../symbols/registry";
import { PAPER_TRADING_UI_SYMBOLS } from "@/lib/trading/paper-ui-symbols";
import { STRATEGY_UUID_CONFIGS } from "@/lib/trading/strategy-configs";
import { STRATEGY_CONFIGS } from "@/lib/trading/backtestEngine";

describe("symbols registry", () => {
  describe("normalizeSymbol", () => {
    it("uppercases and removes separators", () => {
      expect(normalizeSymbol("btc/usdt")).toBe("BTCUSDT");
      expect(normalizeSymbol(" btc-usdt ")).toBe("BTCUSDT");
      expect(normalizeSymbol("SOL/USDT")).toBe("SOLUSDT");
    });

    it("returns empty string for empty input", () => {
      expect(normalizeSymbol("")).toBe("");
    });
  });

  describe("getCanonicalSymbolUniverse", () => {
    it("includes all paper trading UI symbols", () => {
      const universe = getCanonicalSymbolUniverse();
      for (const symbol of PAPER_TRADING_UI_SYMBOLS) {
        expect(universe).toContain(symbol);
      }
    });

    it("includes all strategy UUID preferred pairs", () => {
      const universe = getCanonicalSymbolUniverse();
      for (const config of Object.values(STRATEGY_UUID_CONFIGS)) {
        if (config.preferredPairs) {
          for (const pair of config.preferredPairs) {
            expect(universe).toContain(pair);
          }
        }
      }
    });

    it("includes all backtest strategy config symbols", () => {
      const universe = getCanonicalSymbolUniverse();
      for (const config of Object.values(STRATEGY_CONFIGS)) {
        expect(universe).toContain(config.symbol);
      }
    });

    it("returns a sorted, deduplicated array", () => {
      const universe = getCanonicalSymbolUniverse();
      expect(universe).toEqual([...new Set(universe)].sort());
    });
  });

  describe("getAllowedPairs", () => {
    it("paper without profile returns canonical universe", () => {
      const allowed = getAllowedPairs("paper");
      expect(allowed).toEqual([...getCanonicalSymbolUniverse()]);
    });

    it("paper with profile unions profile pairs with canonical universe", () => {
      const profile: SymbolRiskProfile = {
        allowed_pairs: ["BTCUSDT", "DOGEUSDT", "EXTRAUSDT"],
      };
      const allowed = getAllowedPairs("paper", profile);
      expect(allowed).toContain("BTCUSDT");
      expect(allowed).toContain("DOGEUSDT");
      expect(allowed).toContain("EXTRAUSDT");
      for (const symbol of getCanonicalSymbolUniverse()) {
        expect(allowed).toContain(symbol);
      }
    });

    it("live with profile returns only profile pairs", () => {
      const profile: SymbolRiskProfile = {
        allowed_pairs: ["BTCUSDT", "ETHUSDT"],
      };
      const allowed = getAllowedPairs("live", profile);
      expect(allowed).toEqual(["BTCUSDT", "ETHUSDT"]);
    });

    it("live without profile falls back to canonical universe", () => {
      const allowed = getAllowedPairs("live");
      expect(allowed).toEqual([...getCanonicalSymbolUniverse()]);
    });

    it("normalizes profile pairs", () => {
      const profile: SymbolRiskProfile = {
        allowed_pairs: ["btc/usdt", " eth-usdt "],
      };
      const allowed = getAllowedPairs("live", profile);
      expect(allowed).toEqual(["BTCUSDT", "ETHUSDT"]);
    });
  });

  describe("isCanonicalSymbol", () => {
    it("returns true for canonical symbols", () => {
      expect(isCanonicalSymbol("BTCUSDT")).toBe(true);
    });

    it("normalizes input before checking", () => {
      expect(isCanonicalSymbol("btc/usdt")).toBe(true);
    });

    it("returns false for unknown symbols", () => {
      expect(isCanonicalSymbol("NOTASYMBOL")).toBe(false);
    });
  });
});
