/**
 * Variant C «Beviset» — ny landing 2026-08-10 (Tom-valgt design).
 *
 * Kontrakt:
 * - Hero: én primær CTA → /no/register + 4 tillitspunkter
 * - LofterSection: to kolonner (lover / lover aldri) med 5 punkter hver
 * - BacktestBevisSection: FAKTA-REGEL — rendres IKKE uten reelle data (resultat=null)
 * - SlikVirkerDetSection: 3 steg
 * - FounderSection: 100-første-loven + CTA
 * - LandingFaq: 5 spørsmål (native details — ingen JS påkrevd)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => key,
}));

import BevisHero from "../BevisHero";
import LofterSection from "../LofterSection";
import BacktestBevisSection from "../BacktestBevisSection";
import SlikVirkerDetSection from "../SlikVirkerDetSection";
import FounderSection from "../FounderSection";
import LandingFaq from "../LandingFaq";

describe("BevisHero", () => {
  it("rendrer h1, primær-CTA til /no/register og 4 tillitspunkter", () => {
    render(<BevisHero />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const cta = screen.getByRole("link", { name: /cta/ });
    expect(cta.getAttribute("href")).toBe("/no/register");
    expect(screen.getByText("trust1")).toBeTruthy();
    expect(screen.getByText("trust2")).toBeTruthy();
    expect(screen.getByText("trust3")).toBeTruthy();
    expect(screen.getByText("trust4")).toBeTruthy();
  });
});

describe("LofterSection", () => {
  it("viser to lister — 5 løfter og 5 aldri-løfter", () => {
    render(<LofterSection />);
    const lister = screen.getAllByRole("list");
    expect(lister).toHaveLength(2);
    for (const liste of lister) {
      expect(liste.querySelectorAll("li")).toHaveLength(5);
    }
  });
});

describe("BacktestBevisSection — fakta-regelen", () => {
  it("rendrer INGENTING når resultat er null (ingen reelle data → utelat seksjonen)", () => {
    const { container } = render(<BacktestBevisSection resultat={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("viser resultat + metode + disclaimer når data finnes", () => {
    render(<BacktestBevisSection resultat="+2 340 kr" />);
    expect(screen.getByText("+2 340 kr")).toBeTruthy();
    expect(screen.getByText("disclaimer")).toBeTruthy();
    expect(screen.getByText("m1Title")).toBeTruthy();
    expect(screen.getByText("m2Title")).toBeTruthy();
    expect(screen.getByText("m3Title")).toBeTruthy();
  });

  it("viser hold-sammenligning når holdBelop er gitt", () => {
    render(<BacktestBevisSection resultat="−1 231 kr" holdBelop="−1 924 kr" />);
    expect(screen.getByText("−1 231 kr")).toBeTruthy();
    expect(screen.getByText(/holdLabel/)).toBeTruthy();
    expect(screen.getByText("−1 924 kr")).toBeTruthy();
  });
});

describe("SlikVirkerDetSection", () => {
  it("viser nøyaktig 3 steg", () => {
    render(<SlikVirkerDetSection />);
    const steg = screen.getAllByRole("heading", { level: 3 });
    expect(steg).toHaveLength(3);
  });
});

describe("FounderSection", () => {
  it("viser 100-første-loven og CTA til /no/register", () => {
    render(<FounderSection />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    const cta = screen.getByRole("link", { name: /cta/ });
    expect(cta.getAttribute("href")).toBe("/no/register");
  });
});

describe("LandingFaq", () => {
  it("viser 5 spørsmål som native details (fungerer uten JS)", () => {
    const { container } = render(<LandingFaq />);
    expect(container.querySelectorAll("details")).toHaveLength(5);
    expect(container.querySelectorAll("summary")).toHaveLength(5);
  });
});
