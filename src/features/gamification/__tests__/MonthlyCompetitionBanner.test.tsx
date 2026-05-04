import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyCompetitionBanner } from "../MonthlyCompetitionBanner";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "no" }),
}));

describe("MonthlyCompetitionBanner", () => {
  it("renders banner with trophy icon", () => {
    render(<MonthlyCompetitionBanner />);
    expect(screen.getByText(/monthlyPrize/)).toBeInTheDocument();
    expect(screen.getByText(/monthlyCompetitionOngoing/)).toBeInTheDocument();
  });

  it("links to leaderboard page", () => {
    render(<MonthlyCompetitionBanner />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/no/leaderboard");
  });

  it("shows days left until end of month", () => {
    render(<MonthlyCompetitionBanner />);
    // Should show some number of days left
    const daysText = screen.getByText(/\d+ daysLeft/);
    expect(daysText).toBeInTheDocument();
    // Days left should be >= 0 and <= 31
    const match = daysText.textContent?.match(/(\d+)/);
    expect(match).toBeTruthy();
    const days = parseInt(match![1], 10);
    expect(days).toBeGreaterThanOrEqual(0);
    expect(days).toBeLessThanOrEqual(31);
  });

  it("has correct styling classes", () => {
    render(<MonthlyCompetitionBanner />);
    const link = screen.getByRole("link");
    expect(link.className).toContain("border-amber-500/30");
    expect(link.className).toContain("bg-amber-500/10");
  });
});
