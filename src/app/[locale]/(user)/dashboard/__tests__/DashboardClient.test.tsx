/**
 * Regresjonstest: DashboardClient skal rendre uten «No QueryClient set»-krasj.
 *
 * Bakgrunn (2026-08-09): BestemorPanel bruker useQuery men ble rendret uten
 * QueryClientProvider — hele dashboardet krasjet i prod med
 * "Error: No QueryClient set, use QueryClientProvider to set one".
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardClient from "../DashboardClient";

// Mock alle tunge avhengigheter — vi tester KUN at treet rendres uten QueryClient-feil
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/dashboard/DashboardContent", () => ({
  DashboardContent: () => <div data-testid="dashboard-content" />,
}));

vi.mock("@/features/kraken/KrakenLiveCard", () => ({
  default: () => <div data-testid="kraken-live-card" />,
}));

vi.mock("@/features/dashboard/BestemorPanel", () => ({
  BestemorPanel: () => <div data-testid="bestemor-panel" />,
}));

// Profil-API
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      profile: {
        id: "user-1",
        display_name: "Tom",
        paper_balance: 100000,
        tier: "master",
        preferred_trading_mode: "live",
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        is_priority: true,
      },
    }),
  })
);

describe("DashboardClient — QueryClient-regresjon", () => {
  it("rendrer uten 'No QueryClient set'-krasj", async () => {
    // Hvis QueryClientProvider mangler rundt BestemorPanel, kaster render() her.
    expect(() => render(<DashboardClient locale="no" />)).not.toThrow();
    expect(await screen.findByTestId("dashboard-page")).toBeTruthy();
  });
});
