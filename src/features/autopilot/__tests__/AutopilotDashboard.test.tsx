import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutopilotDashboard } from "../AutopilotDashboard";

// Mock hook-en — vi tester KUN komponentens tilstandslogikk.
vi.mock("@/lib/realtime/autopilot-channel", () => ({
  useAutopilotRealtime: vi.fn(),
}));

import { useAutopilotRealtime } from "@/lib/realtime/autopilot-channel";

const mockHook = vi.mocked(useAutopilotRealtime);

describe("AutopilotDashboard", () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it("viser spinner mens fetch pågår (hasLoaded=false)", () => {
    mockHook.mockReturnValue({
      state: null,
      isLive: false,
      lastUpdate: null,
      error: null,
      hasLoaded: false,
    });
    render(<AutopilotDashboard userId="u1" />);
    expect(screen.getByText(/Laster Kraken-tilkobling/i)).toBeTruthy();
  });

  it("viser 'Ingen Kraken-tilkobling' når fetch er ferdig uten rad (hasLoaded=true, state=null)", () => {
    mockHook.mockReturnValue({
      state: null,
      isLive: false,
      lastUpdate: null,
      error: null,
      hasLoaded: true,
    });
    render(<AutopilotDashboard userId="u1" />);
    expect(screen.getByText(/Ingen Kraken-tilkobling/i)).toBeTruthy();
  });

  it("viser feilmelding når fetch feiler", () => {
    mockHook.mockReturnValue({
      state: null,
      isLive: false,
      lastUpdate: null,
      error: "RLS blokkerte",
      hasLoaded: true,
    });
    render(<AutopilotDashboard userId="u1" />);
    expect(screen.getByText(/Kunne ikke hente Kraken-status/i)).toBeTruthy();
    expect(screen.getByText("RLS blokkerte")).toBeTruthy();
  });

  it("viser egenkapital når autopilot er aktivert", () => {
    mockHook.mockReturnValue({
      state: {
        activated: true,
        initial_equity_usdc: 100,
        current_equity_usdc: 153.43,
        realized_profit_usdc: 10,
        grid_levels: {},
        updated_at: "2026-08-07T11:00:00Z",
      } as never,
      isLive: true,
      lastUpdate: new Date(),
      error: null,
      hasLoaded: true,
    });
    render(<AutopilotDashboard userId="u1" />);
    expect(screen.getByText("$153.43")).toBeTruthy();
    expect(screen.getByText(/\+53\.43% siden start/)).toBeTruthy();
  });
});
