import { describe, it, expect } from "vitest";
import { velgParKandidater, type ParKandidat } from "../par-kandidater";

/**
 * Tester for par-kandidat-filteret (Task 3 — utvidelse av Toms live Kraken-grid).
 *
 * Trippel-filter:
 * 1. OOS PF >= 1.1 (out-of-sample profit factor fra backtest)
 * 2. 24h-range >= 2.5 % (volatilitet — grid trenger svingninger)
 * 3. ordremin × pris × 1.1 <= 8 USDC (dimensjonerbar med ~9 USDC-nivåer)
 *
 * BTC/ETH/SOL (XBT/ETH/SOL i Kraken-verden) er ALLTID med — allerede live.
 */

// Faste data fra kveldens backtest 2026-08-05 (Kraken-symboler)
const UNIVERS: ParKandidat[] = [
  { par: "XBTUSDC", oosProfitFactor: 8.3, rangePct: 1.8, ordremin: 0.00005, prisUsdc: 64900 },
  { par: "ETHUSDC", oosProfitFactor: 9.91, rangePct: 3.8, ordremin: 0.001, prisUsdc: 1920 },
  { par: "SOLUSDC", oosProfitFactor: 6.61, rangePct: 2.2, ordremin: 0.06, prisUsdc: 74.5 },
  { par: "ADAUSDC", oosProfitFactor: 4.49, rangePct: 5.2, ordremin: 20, prisUsdc: 0.19 },
  { par: "AVAXUSDC", oosProfitFactor: 3.03, rangePct: 2.5, ordremin: 0.5, prisUsdc: 6.7 },
  { par: "DOTUSDC", oosProfitFactor: 4.55, rangePct: 2.9, ordremin: 3.9, prisUsdc: 0.85 },
  { par: "LINKUSDC", oosProfitFactor: 5.39, rangePct: 2.0, ordremin: 0.55, prisUsdc: 8.2 },
  { par: "DOGEUSDC", oosProfitFactor: 7.86, rangePct: 1.8, ordremin: 50, prisUsdc: 0.0704 },
  { par: "UNIUSDC", oosProfitFactor: 2.43, rangePct: 1.0, ordremin: 7, prisUsdc: 2.6 },
  { par: "POLUSDC", oosProfitFactor: 22.14, rangePct: 1.0, ordremin: 45, prisUsdc: 0.32 },
];

describe("velgParKandidater", () => {
  it("skal kun godkjenne par som passerer ALLE tre filtre (pluss alltid-med-regelen)", () => {
    const vurderinger = velgParKandidater(UNIVERS);
    const godkjente = vurderinger.filter((v) => v.godkjent).map((v) => v.par);

    // XBT/ETH/SOL: alltid med. ADA/AVAX/DOT: passerer alle tre filtre.
    // LINK/DOGE: range < 2.5 %. UNI/POL: range 1.0 (umålt) + ordremin over taket.
    expect(godkjente).toEqual([
      "XBTUSDC",
      "ETHUSDC",
      "SOLUSDC",
      "ADAUSDC",
      "AVAXUSDC",
      "DOTUSDC",
    ]);
    expect(vurderinger.filter((v) => !v.godkjent)).toHaveLength(4);
  });

  it("skal godkjenne ADA og AVAX med kveldens data (ordremin i USDC)", () => {
    const vurderinger = velgParKandidater(UNIVERS);
    const ada = vurderinger.find((v) => v.par === "ADAUSDC")!;
    const avax = vurderinger.find((v) => v.par === "AVAXUSDC")!;

    expect(ada.godkjent).toBe(true);
    expect(ada.avvisningsgrunner).toEqual([]);
    // 20 × 0.19 × 1.1 = 4.18 ≤ 8
    expect(ada.ordreminUsdc).toBeCloseTo(4.18, 2);

    expect(avax.godkjent).toBe(true);
    expect(avax.avvisningsgrunner).toEqual([]);
    // 0.5 × 6.7 × 1.1 = 3.69 ≤ 8
    expect(avax.ordreminUsdc).toBeCloseTo(3.69, 2);
  });

  it("skal avvise LINK og DOGE på volatilitet (24h-range < 2.5 %)", () => {
    const vurderinger = velgParKandidater(UNIVERS);
    const link = vurderinger.find((v) => v.par === "LINKUSDC")!;
    const doge = vurderinger.find((v) => v.par === "DOGEUSDC")!;

    expect(link.godkjent).toBe(false);
    expect(link.avvisningsgrunner).toHaveLength(1);
    expect(link.avvisningsgrunner[0]).toContain("24h-range");
    expect(link.avvisningsgrunner[0]).toContain("2.0");

    expect(doge.godkjent).toBe(false);
    expect(doge.avvisningsgrunner[0]).toContain("24h-range");
  });

  it("skal avvise UNI og POL på BÅDE volatilitet og ordremin", () => {
    const vurderinger = velgParKandidater(UNIVERS);
    const uni = vurderinger.find((v) => v.par === "UNIUSDC")!;
    const pol = vurderinger.find((v) => v.par === "POLUSDC")!;

    expect(uni.godkjent).toBe(false);
    expect(uni.avvisningsgrunner).toHaveLength(2);
    expect(uni.avvisningsgrunner.join(" ")).toContain("24h-range");
    expect(uni.avvisningsgrunner.join(" ")).toContain("ordremin");
    // 7 × 2.6 × 1.1 = 20.02 > 8
    expect(uni.ordreminUsdc).toBeCloseTo(20.02, 2);

    expect(pol.godkjent).toBe(false);
    expect(pol.avvisningsgrunner).toHaveLength(2);
    // 45 × 0.32 × 1.1 = 15.84 > 8
    expect(pol.ordreminUsdc).toBeCloseTo(15.84, 2);
  });

  it("skal ALLTID inkludere XBT/ETH/SOL uansett filter (allerede live)", () => {
    const vurderinger = velgParKandidater([
      { par: "XBTUSDC", oosProfitFactor: 0.1, rangePct: 0.2, ordremin: 100, prisUsdc: 64900 },
      { par: "ETHUSDC", oosProfitFactor: 0.2, rangePct: 0.1, ordremin: 5, prisUsdc: 1920 },
      { par: "SOLUSDC", oosProfitFactor: 0.3, rangePct: 0.0, ordremin: 1, prisUsdc: 74.5 },
    ]);

    for (const v of vurderinger) {
      expect(v.godkjent).toBe(true);
      expect(v.avvisningsgrunner).toEqual([]);
    }
  });

  it("skal støtte custom alltid-med-liste", () => {
    const vurderinger = velgParKandidater(
      [{ par: "ADAUSDC", oosProfitFactor: 0.5, rangePct: 1.0, ordremin: 500, prisUsdc: 0.19 }],
      { alltidMed: ["ADAUSDC"] },
    );
    expect(vurderinger[0].godkjent).toBe(true);
    expect(vurderinger[0].avvisningsgrunner).toEqual([]);
  });

  it("skal godkjenne par nøyaktig PÅ tersklene (inklusive grenser)", () => {
    const vurderinger = velgParKandidater(
      [{ par: "TESTUSDC", oosProfitFactor: 1.1, rangePct: 2.5, ordremin: 8, prisUsdc: 1 }],
      { marginFaktor: 1 },
    );
    expect(vurderinger[0].godkjent).toBe(true);
    expect(vurderinger[0].ordreminUsdc).toBe(8);
    expect(vurderinger[0].avvisningsgrunner).toEqual([]);
  });

  it("skal avvise par rett under/over tersklene med presise årsaker", () => {
    const vurderinger = velgParKandidater(
      [{ par: "TESTUSDC", oosProfitFactor: 1.09, rangePct: 2.49, ordremin: 8.01, prisUsdc: 1 }],
      { marginFaktor: 1 },
    );
    const v = vurderinger[0];
    expect(v.godkjent).toBe(false);
    expect(v.avvisningsgrunner).toHaveLength(3);
    expect(v.avvisningsgrunner[0]).toContain("OOS PF");
    expect(v.avvisningsgrunner[1]).toContain("24h-range");
    expect(v.avvisningsgrunner[2]).toContain("ordremin");
  });
});
