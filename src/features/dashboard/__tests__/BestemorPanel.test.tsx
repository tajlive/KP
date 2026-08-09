/**
 * Test: BestemorPanel
 * 
 * Tester at panelet viser riktig informasjon for bestemor.
 * 
 * @module features/dashboard/__tests__
 * @version 1.0.0
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BestemorPanel } from "../BestemorPanel";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Wrapper med QueryClient
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("BestemorPanel", () => {
  it("viser robot status", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: "running",
        daily_pnl: 2.5,
        daily_pnl_kr: 47.50,
        explanation: "Prisen gikk opp",
        kill_switch: false,
        leverage: 5,
        symbol: "SOL",
      }),
    });

    renderWithQuery(<BestemorPanel sessionId="test" />);
    
    // Sjekker at status vises
    expect(await screen.findByText(/ROBOTEN KJØRER/i)).toBeTruthy();
  });

  it("viser gevinst i kroner", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: "running",
        daily_pnl: 2.5,
        daily_pnl_kr: 47.50,
        explanation: "Prisen gikk opp",
        kill_switch: false,
        leverage: 5,
        symbol: "SOL",
      }),
    });

    renderWithQuery(<BestemorPanel sessionId="test" />);
    
    expect(await screen.findByText(/47/)).toBeTruthy();
  });

  it("viser hvorfor-forklaring", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: "running",
        daily_pnl: 2.5,
        daily_pnl_kr: 47.50,
        explanation: "Prisen gikk opp, roboten solgte dyrt",
        kill_switch: false,
        leverage: 5,
        symbol: "SOL",
      }),
    });

    renderWithQuery(<BestemorPanel sessionId="test" />);
    
    expect(await screen.findByText(/Hvorfor/i)).toBeTruthy();
    expect(await screen.findByText(/Prisen gikk opp/i)).toBeTruthy();
  });

  it("viser stopp-knapp", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: "running",
        daily_pnl: 0,
        daily_pnl_kr: 0,
        explanation: "Venter",
        kill_switch: false,
        leverage: 5,
        symbol: "SOL",
      }),
    });

    renderWithQuery(<BestemorPanel sessionId="test" />);
    
    expect(await screen.findByText(/STOPP/i)).toBeTruthy();
  });

  it("viser kill switch advarsel", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        status: "running",
        daily_pnl: -3.5,
        daily_pnl_kr: -66.50,
        explanation: "Prisen falt",
        kill_switch: true,
        leverage: 5,
        symbol: "SOL",
      }),
    });

    renderWithQuery(<BestemorPanel sessionId="test" />);
    
    expect(await screen.findByText(/ADVARSEL/i)).toBeTruthy();
    expect(await screen.findByText(/tapt 3%/i)).toBeTruthy();
  });
});
