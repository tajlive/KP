/**
 * Tester for sentiment-service.ts - AI MVP Testplan
 */

import { describe, it, expect, vi } from "vitest";
import {
  classifySentiment,
  formatSentiment,
  shouldAdjustStrategy,
  type MarketSentiment,
} from "./sentiment-service";

describe("sentiment-service", () => {
  describe("classifySentiment", () => {
    it("should classify 0-20 as extreme_fear", () => {
      expect(classifySentiment(0)).toBe("extreme_fear");
      expect(classifySentiment(10)).toBe("extreme_fear");
      expect(classifySentiment(20)).toBe("extreme_fear");
    });

    it("should classify 21-40 as fear", () => {
      expect(classifySentiment(21)).toBe("fear");
      expect(classifySentiment(30)).toBe("fear");
      expect(classifySentiment(40)).toBe("fear");
    });

    it("should classify 41-60 as neutral", () => {
      expect(classifySentiment(41)).toBe("neutral");
      expect(classifySentiment(50)).toBe("neutral");
      expect(classifySentiment(60)).toBe("neutral");
    });

    it("should classify 61-80 as greed", () => {
      expect(classifySentiment(61)).toBe("greed");
      expect(classifySentiment(70)).toBe("greed");
      expect(classifySentiment(80)).toBe("greed");
    });

    it("should classify 81-100 as extreme_greed", () => {
      expect(classifySentiment(81)).toBe("extreme_greed");
      expect(classifySentiment(90)).toBe("extreme_greed");
      expect(classifySentiment(100)).toBe("extreme_greed");
    });
  });

  describe("formatSentiment", () => {
    it("should format extreme_fear correctly in Norwegian", () => {
      const result = formatSentiment("extreme_fear", "no");
      expect(result.label).toBe("Ekstrem Frykt");
      expect(result.color).toBe("text-red-500");
      expect(result.icon).toBe("extreme_fear");
    });

    it("should format extreme_greed correctly in English", () => {
      const result = formatSentiment("extreme_greed", "en");
      expect(result.label).toBe("Extreme Greed");
      expect(result.color).toBe("text-green-500");
      expect(result.icon).toBe("extreme_greed");
    });

    it("should default to Norwegian for unknown locale", () => {
      const result = formatSentiment("neutral", "unknown" as any);
      expect(result.label).toBe("Nøytral");
    });
  });

  describe("shouldAdjustStrategy", () => {
    it("should recommend increasing DCA frequency in extreme fear with high drawdown", () => {
      const result = shouldAdjustStrategy("extreme_fear", 15);
      expect(result.shouldAdjust).toBe(true);
      expect(result.adjustment).toBe("increase_dca_frequency");
    });

    it("should recommend reducing position size in extreme greed", () => {
      const result = shouldAdjustStrategy("extreme_greed", 5);
      expect(result.shouldAdjust).toBe(true);
      expect(result.adjustment).toBe("reduce_position_size");
    });

    it("should not adjust in normal conditions", () => {
      const result = shouldAdjustStrategy("neutral", -5);
      expect(result.shouldAdjust).toBe(false);
      expect(result.adjustment).toBe("none");
    });

    it("should handle fear sentiment without high drawdown", () => {
      const result = shouldAdjustStrategy("fear", 5);
      expect(result.shouldAdjust).toBe(false);
    });
  });
});
