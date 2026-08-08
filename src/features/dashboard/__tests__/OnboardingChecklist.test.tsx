import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: "Kom i gang",
      accountCreated: "Konto opprettet",
      firstTrade: "Gjør din første handel",
      seeResult: "Se resultatet ditt",
      complete: "Du er i gang!",
    };
    return map[key] ?? key;
  },
}));

import { OnboardingChecklist } from "../OnboardingChecklist";

describe("OnboardingChecklist", () => {
  it("huker av konto-punktet og viser første-handel som neste steg", () => {
    render(
      <OnboardingChecklist
        hasAccount
        tradeCount={0}
        hasViewedHistory={false}
      />,
    );
    expect(screen.getByTestId("check-account")).toHaveAttribute(
      "data-done",
      "true",
    );
    expect(screen.getByTestId("check-first-trade")).toHaveAttribute(
      "data-done",
      "false",
    );
    expect(
      screen.getByRole("link", { name: /første handel/i }),
    ).toHaveAttribute("href", expect.stringContaining("/handel?first=1"));
  });

  it("huker av første handel når bruker har trades", () => {
    render(
      <OnboardingChecklist
        hasAccount
        tradeCount={3}
        hasViewedHistory={false}
      />,
    );
    expect(screen.getByTestId("check-first-trade")).toHaveAttribute(
      "data-done",
      "true",
    );
    expect(
      screen.getByRole("link", { name: /resultatet/i }),
    ).toHaveAttribute("href", expect.stringContaining("/dashboard/historikk"));
  });

  it("viser fullført-tilstand når alle punkter er done", () => {
    render(
      <OnboardingChecklist hasAccount tradeCount={1} hasViewedHistory />,
    );
    expect(screen.getByTestId("checklist-complete")).toBeInTheDocument();
  });

  it("viser sjekkliste når ingenting er gjort (fallback uten konto-flagg)", () => {
    render(
      <OnboardingChecklist
        hasAccount={false}
        tradeCount={0}
        hasViewedHistory={false}
      />,
    );
    expect(screen.getByTestId("check-account")).toHaveAttribute(
      "data-done",
      "false",
    );
  });
});
