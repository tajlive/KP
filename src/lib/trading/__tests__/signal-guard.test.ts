import { describe, expect, it } from "vitest";
import { evaluateSignalGuard } from "../signal-guard";

/**
 * Engine-nivå signal-guard (Tom-krav 2026-07-25):
 * Avvis ALLE kjøpssignaler med expectancy < 0 ELLER confidence = 0.
 *
 * Bakgrunn: prod-data 2026-07-18 → 2026-07-25 viste 4 DCA-kjøp hvor
 * 3 hadde "WARNING: expectancy < 0" (E=-9.0%) og confidence 0 i
 * strategy_signal — bot-en kjøpte mot sitt eget varsel fordi
 * position-size.ts kun reduserte størrelsen (0.5%) i stedet for å blokkere.
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
      // Begge bruddene er til stede — guard-en rapporterer det første den treffer
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

    it("blokkerer ALDRI salg — exits skal alltid gjennomføres", () => {
      expect(
        evaluateSignalGuard({
          action: "sell",
          confidence: 0,
          expectancy: -9.0,
        }).allowed,
      ).toBe(true);
    });

    it("påvirker ikke hold", () => {
      expect(evaluateSignalGuard({ action: "hold" }).allowed).toBe(true);
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
  });
});
