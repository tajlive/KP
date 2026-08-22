import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      title: "Din første handel",
      stepCoin: "Velg krypto",
      stepAmount: "Velg beløp",
      stepConfirm: "Bekreft",
      confirmCta: "Bekreft kjøp",
      summary: `Du kjøper ${params?.coin ?? ""} for ${params?.amount ?? ""} kr`,
      paperBadge: "Lekepenger",
      success: "Handelen er gjennomført!",
      minError: "Minimumsbeløp er 50 kr",
    };
    return map[key] ?? key;
  },
  useLocale: () => "no",
}));

vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({
    prices: {
      BTCUSDT: { price: 650000 },
      ETHUSDT: { price: 35000 },
      SOLUSDT: { price: 1500 },
    },
  }),
}));

const mockFetch = vi.fn();

import { FirstTradeFlow } from "../FirstTradeFlow";

describe("FirstTradeFlow", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("viser tre coin-valg i steg 1", () => {
    render(<FirstTradeFlow onComplete={vi.fn()} />);
    expect(screen.getByTestId("first-trade-flow")).toBeInTheDocument();
    expect(screen.getByTestId("coin-BTC")).toBeInTheDocument();
    expect(screen.getByTestId("coin-ETH")).toBeInTheDocument();
    expect(screen.getByTestId("coin-SOL")).toBeInTheDocument();
  });

  it("går til beløpssteg med hurtigvalg etter coin-valg", () => {
    render(<FirstTradeFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId("coin-BTC"));
    expect(screen.getByTestId("amount-200")).toBeInTheDocument();
    expect(screen.getByTestId("amount-500")).toBeInTheDocument();
    expect(screen.getByTestId("amount-1000")).toBeInTheDocument();
  });

  it("poster til paper-execute med valgt coin og beløp", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    render(<FirstTradeFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId("coin-ETH"));
    fireEvent.click(screen.getByTestId("amount-500"));
    fireEvent.click(screen.getByTestId("confirm-trade"));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/paper-trading/execute");
    const body = JSON.parse(opts.body as string);
    expect(body).toMatchObject({
      pair: "ETH/USDT",
      side: "buy",
      amount_nok: 500,
    });
  });

  it("kaller onComplete ved vellykket handel", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });
    const onComplete = vi.fn();
    render(<FirstTradeFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("coin-BTC"));
    fireEvent.click(screen.getByTestId("amount-200"));
    fireEvent.click(screen.getByTestId("confirm-trade"));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("viser feil og kaller ikke onComplete ved API-feil", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: "Saldo for lav" }),
    });
    const onComplete = vi.fn();
    render(<FirstTradeFlow onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("coin-BTC"));
    fireEvent.click(screen.getByTestId("amount-1000"));
    fireEvent.click(screen.getByTestId("confirm-trade"));
    await waitFor(() =>
      expect(screen.getByTestId("trade-error")).toHaveTextContent(
        "Saldo for lav",
      ),
    );
    expect(onComplete).not.toHaveBeenCalled();
  });
});
