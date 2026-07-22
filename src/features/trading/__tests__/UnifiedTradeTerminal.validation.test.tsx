import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({
    prices: { BTCUSDT: { price: 690777, price_change_percent_24h: 2.3 } },
    loading: false,
    isConnected: true,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { UnifiedTradeTerminal } from "../UnifiedTradeTerminal";

describe("UnifiedTradeTerminal validation", () => {
  it("shows error when amount is 0", () => {
    render(<UnifiedTradeTerminal />);

    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "0" } });

    const kjøpBtn = screen.getByText("Kjøp BTC");
    fireEvent.click(kjøpBtn);

    const errors = screen.getAllByText("Beløpet må være større enn 0");
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error when amount is negative", () => {
    render(<UnifiedTradeTerminal />);

    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "-500" } });

    const kjøpBtn = screen.getByText("Kjøp BTC");
    fireEvent.click(kjøpBtn);

    const errors = screen.getAllByText("Beløpet må være større enn 0");
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it("shows no validation error for valid positive amount", () => {
    render(<UnifiedTradeTerminal />);

    // Default amount is "1000", should be valid
    const kjøpBtn = screen.getByText("Kjøp BTC");

    // Before clicking, no error should be visible
    expect(screen.queryByText("Beløpet må være større enn 0")).not.toBeInTheDocument();
  });
});
