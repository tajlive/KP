/**
 * PriserBevis — ny /priser-side (mega-plan Oppgave 1.3 + Toms prisbeslutning 2026-08-10).
 *
 * Låst av Tom: Student gratis · Pro 399 kr/mnd · Pro+ 799 kr/mnd ·
 * årspris 2 mnd gratis (3 990 / 7 990).
 *
 * Kontrakt:
 * - 3 tiers: Student / Pro / Pro+ — Pro merket «Mest populær»
 * - Måned/år-toggle viser riktige priser begge veier
 * - FOUNDER-LOVEN prominent + live telling fra /api/stats/users (ærlig skjult ved feil)
 * - tickerSlot rendres (ekte markedsdata — server-komponent sendes inn)
 * - FAQ inkl. godkjent refusjon-svar
 * - Beta-ærlighet: CTA = registrer seg (betaling aktiveres etter beta)
 * - INGEN «lønner det seg»-utregning (Tom-beslutning 2026-08-10)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => key,
}));

import PriserBevis from "../PriserBevis";

const realFetch = global.fetch;

function mockUserStats(count: number | null) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: count !== null,
    json: () => Promise.resolve(count !== null ? { count } : {}),
  } as Response);
}

describe("PriserBevis", () => {
  beforeEach(() => {
    mockUserStats(null); // default: API svarer ikke brukbart
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("viser 3 tiers med Pro som «Mest populær»", () => {
    const { container } = render(<PriserBevis />);
    const kort = container.querySelectorAll("[data-testid^='tier-']");
    expect(kort.length).toBe(3);
    expect(screen.getByTestId("tier-pro").textContent).toContain("mostPopular");
  });

  it("viser månedspriser 399/799 som standard, og årspriser 3 990/7 990 etter toggle", () => {
    render(<PriserBevis />);
    // no-NO tusenskille er non-breaking space (U+00A0/U+202F) — normaliser før sjekk
    const norm = (s: string | null) => (s ?? "").replace(/[\u00A0\u202F]/g, " ");
    expect(norm(screen.getByTestId("pris-pro").textContent)).toContain("399");
    expect(norm(screen.getByTestId("pris-propluss").textContent)).toContain("799");
    fireEvent.click(screen.getByRole("button", { name: /toggleAnnual/ }));
    expect(norm(screen.getByTestId("pris-pro").textContent)).toContain("3 990");
    expect(norm(screen.getByTestId("pris-propluss").textContent)).toContain("7 990");
    expect(screen.getByTestId("pris-student").textContent).toContain("0");
  });

  it("viser FOUNDER-LOVEN prominent", () => {
    render(<PriserBevis />);
    expect(screen.getByText(/founderTitle/)).toBeTruthy();
  });

  it("viser live founder-telling når API svarer", async () => {
    mockUserStats(42);
    render(<PriserBevis />);
    expect(await screen.findByTestId("founder-count")).toHaveTextContent("42");
  });

  it("viser INGEN telling når API feiler (aldri fabrikkert tall)", () => {
    mockUserStats(null);
    render(<PriserBevis />);
    expect(screen.queryByTestId("founder-count")).toBeNull();
  });

  it("rendrer tickerSlot (ekte markedsdata fra server)", () => {
    render(<PriserBevis tickerSlot={<div data-testid="ticker-mock">BTC</div>} />);
    expect(screen.getByTestId("ticker-mock")).toBeTruthy();
  });

  it("FAQ har 5 spørsmål inkl. refusjon-svaret", () => {
    const { container } = render(<PriserBevis />);
    expect(container.querySelectorAll("details")).toHaveLength(5);
    expect(screen.getByText(/faqA2/)).toBeTruthy();
  });

  it("alle CTA-er går til /no/register (beta — betaling aktiveres senere)", () => {
    const { container } = render(<PriserBevis />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs.filter((h) => h === "/no/register").length).toBeGreaterThanOrEqual(3);
  });
});
