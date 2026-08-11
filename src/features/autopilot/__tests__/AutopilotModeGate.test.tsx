/**
 * AutopilotModeGate — P1.2 (2026-08-11): «/handel viser live-tall i
 * Lekepenger-modus». Kraken Autopilot-panelet (EKTE penger, $-beløp)
 * rendres KUN i live-modus. Paper/live-data skilles strengt.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockMode = vi.fn<() => "paper" | "live">();
vi.mock("@/features/trading-cockpit/hooks/useCockpit", () => ({
  useCockpit: () => ({ mode: mockMode() }),
}));

vi.mock("../AutopilotDashboard", () => ({
  AutopilotDashboard: () => <div data-testid="autopilot-panel">LIVE-PANEL</div>,
}));

import { AutopilotModeGate } from "../AutopilotModeGate";

describe("AutopilotModeGate (P1.2)", () => {
  it("paper-modus → live-panelet rendres IKKE", () => {
    mockMode.mockReturnValue("paper");
    render(<AutopilotModeGate userId="u1" />);
    expect(screen.queryByTestId("autopilot-panel")).toBeNull();
  });

  it("live-modus → panelet rendres", () => {
    mockMode.mockReturnValue("live");
    render(<AutopilotModeGate userId="u1" />);
    expect(screen.getByTestId("autopilot-panel")).toBeTruthy();
  });
});
