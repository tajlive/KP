import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("viser tittel, beskrivelse og illustrasjon", () => {
    render(
      <EmptyState
        variant="chart"
        title="Ingen handler ennå"
        description="Gjør din første handel for å se data her."
      />,
    );
    expect(screen.getByText("Ingen handler ennå")).toBeInTheDocument();
    expect(
      screen.getByText("Gjør din første handel for å se data her."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("empty-state-illustration")).toBeInTheDocument();
  });

  it("viser CTA-lenke når action er satt", () => {
    render(
      <EmptyState
        variant="wallet"
        title="Ingen posisjoner"
        description="Start en handel."
        action={{ label: "Start handel", href: "/trade" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Start handel" });
    expect(link).toHaveAttribute("href", "/trade");
  });

  it("skjuler illustrasjon i compact-modus (for chart-bokser)", () => {
    render(<EmptyState variant="chart" title="Ingen data" compact />);
    expect(screen.getByText("Ingen data")).toBeInTheDocument();
    expect(
      screen.queryByTestId("empty-state-illustration"),
    ).not.toBeInTheDocument();
  });
});
