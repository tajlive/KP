import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import KrakenLiveCard from "../KrakenLiveCard";

// Mock fetch — komponenten henter /api/kraken/live-state
const mockFetch = vi.fn();

function mockLiveState(overrides: Record<string, unknown> = {}) {
  return {
    connected: true,
    total_usdc: 153.7,
    open_buy_orders: 12,
    open_sell_orders: 1,
    realized_profit_usdc: 0,
    updated_at: "2026-08-07T12:05:00.000Z",
    snapshot: {
      orders: [
        {
          txid: "a1",
          pair: "BTCUSDC",
          side: "buy",
          price: 60000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "a2",
          pair: "BTCUSDC",
          side: "buy",
          price: 61000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "a3",
          pair: "BTCUSDC",
          side: "buy",
          price: 62000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "a4",
          pair: "BTCUSDC",
          side: "buy",
          price: 63000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "a5",
          pair: "BTCUSDC",
          side: "buy",
          price: 64000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "a6",
          pair: "BTCUSDC",
          side: "sell",
          price: 66000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "b1",
          pair: "ETHUSDC",
          side: "buy",
          price: 1900,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "b2",
          pair: "ETHUSDC",
          side: "buy",
          price: 1950,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "b3",
          pair: "ETHUSDC",
          side: "buy",
          price: 2000,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "b4",
          pair: "ETHUSDC",
          side: "buy",
          price: 2050,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "c1",
          pair: "SOLUSDC",
          side: "buy",
          price: 70,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "c2",
          pair: "SOLUSDC",
          side: "buy",
          price: 72,
          volume: 1,
          filled: 0,
          status: "open",
        },
        {
          txid: "c3",
          pair: "SOLUSDC",
          side: "buy",
          price: 74,
          volume: 1,
          filled: 0,
          status: "open",
        },
      ],
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KrakenLiveCard", () => {
  it("viser ingenting for papir-bruker (connected=false)", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ connected: false }),
    });
    const { container } = render(<KrakenLiveCard />);
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    // Vent til connected=false har satt state (loading-state forsvinner)
    await vi.waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("viser Total verdi med korrekt beløp", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockLiveState()),
    });
    render(<KrakenLiveCard />);
    expect(await screen.findByText("$153.70")).toBeTruthy();
  });

  it("viser antall kjøp/salg som venter", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockLiveState()),
    });
    render(<KrakenLiveCard />);
    expect(await screen.findByText("12 kjøp venter")).toBeTruthy();
    expect(screen.getByText("1 salg venter")).toBeTruthy();
    expect(screen.getByText("13 støvsugere totalt")).toBeTruthy();
  });

  it("viser norske myntnavn per par", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockLiveState()),
    });
    render(<KrakenLiveCard />);
    expect(await screen.findByText("Bitcoin")).toBeTruthy();
    expect(screen.getByText("Ethereum")).toBeTruthy();
    expect(screen.getByText("Solana")).toBeTruthy();
  });

  it("viser korrekt kjøp/salg per par (Bitcoin 5 kjøp + 1 salg)", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockLiveState()),
    });
    render(<KrakenLiveCard />);
    expect(await screen.findByText("Bitcoin")).toBeTruthy();
    expect(screen.getByText("5 kjøp")).toBeTruthy();
    expect(screen.getByText("1 salg")).toBeTruthy();
  });

  it("viser støvsuger-forklaringen", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockLiveState()),
    });
    render(<KrakenLiveCard />);
    expect(
      await screen.findByText(/Støvsugere ligger på faste prisnivåer/),
    ).toBeTruthy();
  });
});
