import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "paperMode": "Papir",
      "liveMode": "Live",
      "noData": "Ingen data",
      "ctaPaper": "Start handel",
      "ctaLive": "Start live",
    };
    return map[key] ?? key;
  },
}));

vi.mock("framer-motion", () => ({
  m: {
    header: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <header {...props}>{children}</header>
    ),
  },
}));

vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatByMode: (amount: number) => `${amount} kr`,
  }),
}));

import { DashboardTopBar } from "../DashboardTopBar";

describe("DashboardTopBar", () => {
  it("renders balance and positive change percentage", () => {
    render(<DashboardTopBar balance={100000} changePct={5.5} mode="paper" />);
    expect(screen.getByText("100000 kr")).toBeInTheDocument();
    expect(screen.getByText("+5.50%")).toBeInTheDocument();
  });

  it("renders 'Ingen data' when balance is null", () => {
    render(<DashboardTopBar balance={null} changePct={null} mode="paper" />);
    expect(screen.getAllByText("Ingen data").length).toBeGreaterThan(0);
  });

  it("does not render NaN% when changePct is NaN", () => {
    render(<DashboardTopBar balance={100000} changePct={Number.NaN} mode="paper" />);
    expect(screen.queryByText(/NaN%/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Ingen data").length).toBe(1);
  });

  it("does not render Infinity% when changePct is Infinity", () => {
    render(<DashboardTopBar balance={100000} changePct={Infinity} mode="paper" />);
    expect(screen.queryByText(/Infinity%/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Ingen data").length).toBe(1);
  });

  it("renders negative change with minus prefix", () => {
    render(<DashboardTopBar balance={90000} changePct={-3.2} mode="paper" />);
    expect(screen.getByText("-3.20%")).toBeInTheDocument();
  });
});
