import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioBalance } from "../PortfolioBalance";

// Mock next-intl/server — async getTranslations returnerer en sync t-funksjon
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation(async () => {
    return (key: string) => {
      const translations: Record<string, string> = {
        totalPortfolioValue: "Total porteføljeverdi",
      };
      return translations[key] ?? key;
    };
  }),
}));

// Mock getDashboardNumberLocale — enkel return av nb-NO
vi.mock("@/i18n/get-dashboard-number-locale", () => ({
  getDashboardNumberLocale: vi.fn().mockResolvedValue("nb-NO"),
}));

describe("PortfolioBalance", () => {
  it("rendrer totalNok formatert i norsk tallformat", async () => {
    const component = await PortfolioBalance({
      totalNok: 100000,
      deltaPercent: 5.25,
    });
    render(component);

    // 100 000 kr (med nb-NO spacing)
    expect(screen.getByText(/100[\s\u00a0]?000\s*kr/)).toBeInTheDocument();
  });

  it("rendrer positiv delta med pluss-tegn og grønn farge", async () => {
    const component = await PortfolioBalance({
      totalNok: 50000,
      deltaPercent: 12.5,
    });
    const { container } = render(component);

    // Sjekk at +12.50% vises
    expect(screen.getByText("+12.50%")).toBeInTheDocument();

    // Sjekk grønn farge på positiv delta
    const deltaElement = container.querySelector(".text-emerald-600");
    expect(deltaElement).toBeInTheDocument();
    expect(deltaElement).toHaveTextContent("+12.50%");
  });

  it("rendrer negativ delta med minus og rød farge", async () => {
    const component = await PortfolioBalance({
      totalNok: 50000,
      deltaPercent: -3.75,
    });
    const { container } = render(component);

    // Sjekk at -3.75% vises (uten pluss)
    expect(screen.getByText("-3.75%")).toBeInTheDocument();

    // Sjekk rød farge på negativ delta
    const deltaElement = container.querySelector(".text-rose-600");
    expect(deltaElement).toBeInTheDocument();
    expect(deltaElement).toHaveTextContent("-3.75%");
  });

  it("rendrer null delta som +0.00% i grønt", async () => {
    const component = await PortfolioBalance({
      totalNok: 0,
      deltaPercent: 0,
    });
    render(component);

    expect(screen.getByText("+0.00%")).toBeInTheDocument();
  });

  it("rendrer etikett 'Total porteføljeverdi'", async () => {
    const component = await PortfolioBalance({
      totalNok: 100000,
      deltaPercent: 5.25,
    });
    render(component);

    expect(
      screen.getByText("Total porteføljeverdi"),
    ).toBeInTheDocument();
  });

  it("rendrer stort beløp uten overflow", async () => {
    const component = await PortfolioBalance({
      totalNok: 999999999,
      deltaPercent: 1.5,
    });
    const { container } = render(component);

    // Sjekk at headingen har break-words for store tall
    const heading = container.querySelector("h1");
    expect(heading).toBeInTheDocument();
    expect(heading!.className).toContain("break-words");
  });

  it("rendrer delta med to desimaler", async () => {
    const component = await PortfolioBalance({
      totalNok: 100,
      deltaPercent: 7.7777,
    });
    render(component);

    // Skal være avrundet til 2 desimaler
    expect(screen.getByText("+7.78%")).toBeInTheDocument();
  });
});
