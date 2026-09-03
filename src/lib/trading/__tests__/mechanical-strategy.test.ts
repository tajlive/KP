/**
 * Regresjonstest 2026-09-03 (KLA: DCA-buy blokkert for alltid).
 *
 * Prod-hendelse: DCA-strategien produserte buy UTEN reason → grid/DCA-unntaket
 * i signal-guard (reason-streng-match "DCA buy") slo aldri inn → Kelly-
 * expectancy fra gamle tapende trades (E=-1.9%) blokkerte ALLE DCA-kjøp.
 * Prod-effekt: 692 signal_guard_blocked / 7 dager, 4 brukere, sesjoner døde
 * i 10+ dager (sist kjøp 24.08 → deploy 03.09).
 *
 * Rotårsak: unntaket matchet på reason-TEKST ("DCA buy") i 5 kopierte
 * uttrykk, men ingen strategi produserte den eksakte strengen. Riktig fiks:
 * isMechanicalStrategy() matcher på ENGINE-KEY, ikke reason.
 *
 * Denne testen verner invarianten: mekaniske strategier (grid/simple_grid/
 * dca/max_aggressive) MÅ forbli unntatt fra Kelly-expectancy-guarden,
 * uavhengig av hvilken reason strategien tilfeldigvis produserer.
 */
import { describe, it, expect } from "vitest";
import { isMechanicalStrategy } from "../mechanical-strategy";

describe("isMechanicalStrategy — guard-unntak etter ENGINE-KEY (KLA 2026-09-03)", () => {
  it("unntar mekaniske strategier som har EGEN gevinst-/tapshåndtering", () => {
    for (const key of ["grid", "simple_grid", "dca", "max_aggressive"]) {
      expect(isMechanicalStrategy(key), `${key} skal være mekanisk`).toBe(true);
    }
  });

  it("unntar IKKE spekulative strategier (skal forbli under expectancy-guard)", () => {
    for (const key of [
      "trend_follow",
      "multi_signal",
      "ensemble_ai",
      "ai_copy",
      "hybrid_arbitrage",
      "trend_balansert",
      "multisignal_aktiv",
      "dca_trygg",
    ]) {
      expect(isMechanicalStrategy(key), `${key} skal IKKE være mekanisk`).toBe(
        false,
      );
    }
  });

  it("behandler null/undefined som ikke-mekanisk (konservativ — guard på)", () => {
    expect(isMechanicalStrategy(null)).toBe(false);
    expect(isMechanicalStrategy(undefined)).toBe(false);
    expect(isMechanicalStrategy("")).toBe(false);
  });

  it("dca_trygg-aliaset mapper til dca via resolveTickStrategyEngineKey", async () => {
    // Aliaset er strategi-nivå; engine-key 'dca' er det som når tick-guarden.
    // Dette sikrer at dca_trygg-sesjoner faktisk ender som mekaniske i tick.
    const { resolveTickStrategyEngineKey } =
      await import("../strategy-id-aliases");
    expect(resolveTickStrategyEngineKey("dca_trygg")).toBe("dca");
    expect(
      isMechanicalStrategy(resolveTickStrategyEngineKey("dca_trygg")),
    ).toBe(true);
    expect(isMechanicalStrategy(resolveTickStrategyEngineKey("grid"))).toBe(
      true,
    );
    expect(
      isMechanicalStrategy(resolveTickStrategyEngineKey("trend_follow")),
    ).toBe(false);
  });
});
