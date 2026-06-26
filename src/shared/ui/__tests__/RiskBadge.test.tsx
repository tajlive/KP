import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { RiskBadge } from "../RiskBadge";

const messages = {
  components: {
    riskBadge: {
      label: "Risiko: {level}",
      low: "Lav risiko",
      medium: "Middels risiko",
      high: "Høy risiko",
    },
  },
};

const renderWithI18n = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
};

describe("RiskBadge", () => {
  it("renders low risk with green text and arrow-down icon", () => {
    renderWithI18n(<RiskBadge level="low" />);
    expect(screen.getByText("Lav risiko")).toBeInTheDocument();
  });

  it("renders high risk with red text and warning icon", () => {
    renderWithI18n(<RiskBadge level="high" />);
    expect(screen.getByText("Høy risiko")).toBeInTheDocument();
  });
});
