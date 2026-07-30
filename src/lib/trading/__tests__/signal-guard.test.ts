import { describe, expect, it } from "vitest";
import { evaluateSignalGuard } from "../signal-guard";

/**
 * Engine-nivå signal-guard (Tom-krav 2026-07-25):
 * Avvis ALLE kjøpssignaler med expectancy < 0 ELLER confidence = 0.
 *
 * + FORSTERKET 2026-07-28:
 *   - Sell-side size clamp (max 50% av posisjon)
 *   - Dupliseringsdeteksjon
 *   - Loss streak circuit breaker
 *   - Sell uten exitReason blokkeres
 *   - Strengere rate-limit for ETHUSDT/SOLUSDT
 */
describe("evaluateSignalGuard", () => {
  describe("prod-regresjon: 3-av-4-tilfellet kan ikke gjenta seg", () => {
    it("blokkerer kjøp 1 (E=-9.0%, confidence=0)", () => {
      const result = evaluateSignalGuard({
        action: "buy",
        confidence: 0,
        expectancy: -9.0,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/expectancy|confidence/);
    });

    it("blokkerer kjøp 2 (E=-9.0%, confidence=0)", () => {
      expect(
        evaluateSignalGuard({ action: "buy", confidence: 0, expectancy: -9.0 })
          .allowed,
      ).toBe(false);
    });

    it("blokkerer kjøp 3 (E=-9.0%, confidence=0)", () => {
      expect(
        evaluateSignalGuard({ action: "buy", confidence: 0, expectancy: -9.0 })
          .allowed,
      ).toBe(false);
    });

    it("blokkerer også positiv expectancy når confidence=0 (Toms 'eller'-regel)", () => {
      const result = evaluateSignalGuard({
        action: "buy",
        confidence: 0,
        expectancy: 30.5,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("confidence");
    });
  });

  describe("tillater legitime signaler", () => {
    it("tillater kjøp med positiv expectancy og confidence > 0", () => {
      expect(
        evaluateSignalGuard({
          action: "buy",
          confidence: 0.7,
          expectancy: 5.0,
        }).allowed,
      ).toBe(true);
    });

    it("tillater kjøp uten statistikk (DCA-timerkjøp, ny bruker)", () => {
      expect(evaluateSignalGuard({ action: "buy" }).allowed).toBe(true);
      expect(
        evaluateSignalGuard({
          action: "buy",
          confidence: undefined,
          expectancy: undefined,
        }).allowed,
      ).toBe(true);
    });

    it("tillater expectancy nøyaktig 0 (ny bruker uten trades)", () => {
      expect(
        evaluateSignalGuard({ action: "buy", confidence: 0.5, expectancy: 0 })
          .allowed,
      ).toBe(true);
    });

    it("tillater KUN salg med gyldig exit-reason (stop_loss, take_profit, manual)", () => {
      // Manuelle exits alltid tillatt
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0,
          exitReason: "stop_loss",
        }).allowed,
      ).toBe(true);
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0,
          exitReason: "take_profit",
        }).allowed,
      ).toBe(true);
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0,
          exitReason: "manual",
        }).allowed,
      ).toBe(true);
    });

    it("tillater auto-salg med confidence > 0 og uten rate-limit", () => {
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0.5,
          exitReason: "auto",
          msSinceLastAutoSell: 20 * 60 * 1000, // 20 min — over grensen
        }).allowed,
      ).toBe(true);
    });

    it("påvirker ikke hold", () => {
      expect(evaluateSignalGuard({ action: "hold" }).allowed).toBe(true);
    });

    it("tillater stop_loss salg uansett position size (size clamp unntak)", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.8,
        exitReason: "stop_loss",
        currentPositionQty: 1.0,
        maxSellQty: 1.0, // 100% av posisjon — vanlig for SL
      });
      expect(result.allowed).toBe(true);
    });

    it("tillater manuelt salg uansett posisjonsstørrelse", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.9,
        exitReason: "manual",
        currentPositionQty: 1.0,
        maxSellQty: 1.0,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("nye 2026-07-28: sell-side size clamp (REGEL 4)", () => {
    it("blokkerer auto-sell som overstiger 50% av posisjon", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        currentPositionQty: 1.0,
        maxSellQty: 0.8, // 80% av posisjon — over 50%-grensa
        symbol: "BTCUSDT",
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("50%");
      expect(result.recommendedMaxQty).toBe(0.5);
    });

    it("tillater auto-sell innenfor 50% av posisjon", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        currentPositionQty: 1.0,
        maxSellQty: 0.3, // 30% — under 50%-grensa
        symbol: "BTCUSDT",
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(true);
    });

    it("ignorerer size clamp når currentPositionQty er null", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        currentPositionQty: null,
        maxSellQty: 0.8,
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("nye 2026-07-28: dupliseringsdeteksjon (REGEL 5)", () => {
    const now = new Date().toISOString();
    const recentSell = {
      tradingPair: "BTCUSDT",
      side: "sell" as const,
      quantity: 0.5,
      price: 60000,
      realizedPnl: null,
      executedAt: new Date(Date.now() - 10_000).toISOString(), // 10 sek siden
    };

    it("blokkerer duplikat-sell med identisk quantity innen 60s", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "BTCUSDT",
        maxSellQty: 0.5,
        currentPositionQty: 1.0,
        msSinceLastAutoSell: 20 * 60 * 1000,
        recentTrades: [recentSell],
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("duplikat");
    });

    it("tillater sell med annen quantity (ikke duplikat)", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "BTCUSDT",
        maxSellQty: 0.3, // annen qty
        currentPositionQty: 1.0,
        msSinceLastAutoSell: 20 * 60 * 1000,
        recentTrades: [recentSell],
      });
      expect(result.allowed).toBe(true);
    });

    it("ignorerer duplikatsjekk uten recentTrades", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "BTCUSDT",
        maxSellQty: 0.5,
        currentPositionQty: 1.0,
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("nye 2026-07-28: loss streak circuit breaker (REGEL 6)", () => {
    it("blokkerer sell etter 3+ consecutive losses", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        consecutiveLosses: 4,
        currentPositionQty: 1.0,
        maxSellQty: 0.5,
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("circuit breaker");
      expect(result.recommendedMaxQty).toBe(0.5); // 1.0 * 0.5^1
    });

    it("tillater sell med 2 consecutive losses (under terskel)", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        consecutiveLosses: 2,
        currentPositionQty: 1.0,
        maxSellQty: 0.5,
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(true);
    });

    it("ignorerer circuit breaker når consecutiveLosses er undefined", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        currentPositionQty: 1.0,
        maxSellQty: 0.5,
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(true);
    });

    it("innfører progressiv reduksjon for 6+ losses (2 nivåer)", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        consecutiveLosses: 6,
        currentPositionQty: 1.0,
        maxSellQty: 0.5,
        msSinceLastAutoSell: 20 * 60 * 1000,
      });
      expect(result.allowed).toBe(false);
      expect(result.recommendedMaxQty).toBeCloseTo(0.25, 2); // 1.0 * 0.5^2
    });
  });

  describe("nye 2026-07-28: sell uten exitReason blokkeres (REGEL 7)", () => {
    it("blokkerer sell uten exitReason", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exitReason");
    });

    it("blokkerer sell med tom exitReason", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "",
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exitReason");
    });
  });

  describe("nye 2026-07-28: strengere rate-limit for ETHUSDT/SOLUSDT", () => {
    it("blokkerer ETHUSDT auto-sell innen 30 min (strengere enn 15)", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "ETHUSDT",
        msSinceLastAutoSell: 20 * 60 * 1000, // 20 min — OK for 15min, ikke for 30min
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("30min");
    });

    it("tillater ETHUSDT auto-sell etter 30 min", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "ETHUSDT",
        msSinceLastAutoSell: 31 * 60 * 1000, // 31 min
      });
      expect(result.allowed).toBe(true);
    });

    it("blokkerer SOLUSDT auto-sell innen 30 min", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "SOLUSDT",
        msSinceLastAutoSell: 10 * 60 * 1000, // 10 min
      });
      expect(result.allowed).toBe(false);
    });

    it("BTCUSDT bruker fortsatt 15 min standard", () => {
      const result = evaluateSignalGuard({
        action: "sell",
        confidence: 0.7,
        exitReason: "auto",
        symbol: "BTCUSDT",
        msSinceLastAutoSell: 20 * 60 * 1000, // 20 min — OK for 15min
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("kanttilfeller", () => {
    it("confidence=null tolkes som fravær av data (tillatt)", () => {
      expect(
        evaluateSignalGuard({ action: "buy", confidence: null, expectancy: 5 })
          .allowed,
      ).toBe(true);
    });

    it("expectancy=null tolkes som fravær av data (tillatt)", () => {
      expect(
        evaluateSignalGuard({ action: "buy", confidence: 0.8, expectancy: null })
          .allowed,
      ).toBe(true);
    });

    it("negativ expectancy alene blokkerer selv med høy confidence", () => {
      const result = evaluateSignalGuard({
        action: "buy",
        confidence: 0.95,
        expectancy: -0.1,
      });
      expect(result.allowed).toBe(false);
    });

    it("blokkerer auto-salg med confidence=0 (forhindrer exit-cascade)", () => {
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0,
          exitReason: "time_exit",
        }).allowed,
      ).toBe(false);
    });

    it("blokkerer auto-salg innenfor rate-limit (15 min)", () => {
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0.5,
          exitReason: "auto",
          msSinceLastAutoSell: 5 * 60 * 1000, // kun 5 min siden forrige
        }).allowed,
      ).toBe(false);
    });
  });
});
