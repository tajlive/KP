import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({
    // usePrices er normalisert til NOK (DB er NOK, WebSocket USDT konverteres i hooken).
    prices: { BTCUSDT: { price: 690777, price_change_percent_24h: 2.3 } },
    loading: false,
    isConnected: true,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { UnifiedTradeTerminal } from "../UnifiedTradeTerminal";

describe("UnifiedTradeTerminal prices", () => {
  it("shows BTC price converted to NOK, not raw USDT labeled kr", () => {
    render(<UnifiedTradeTerminal />);
    // Skal vise NOK-prisen direkte, ikke rå USDT labela som kr.
    expect(screen.queryByText(/63\s?258\s?kr/)).not.toBeInTheDocument();
    const nokPriceElements = screen.getAllByText(/690\s?777/);
    expect(nokPriceElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render the fake sparkline chart with its NOK price overlay", () => {
    render(<UnifiedTradeTerminal />);
    // The old SparklineChart always rendered a random price followed by "NOK"
    // e.g. "60 771,533 NOK". Check no such fake price overlay exists.
    // The label "Beløp (NOK)" is legitimate — ignore label elements.
    const nokSpans = screen.queryAllByText(/NOK/);
    const chartOverlays = nokSpans.filter(
      (el) => el.tagName === "SPAN" && !el.closest("label"),
    );
    // After removing the fake chart, only the label "Beløp (NOK)" uses <label>.
    // No stray <span>NOK</span> should exist in chart overlays.
    expect(chartOverlays.length).toBe(0);
  });
});
