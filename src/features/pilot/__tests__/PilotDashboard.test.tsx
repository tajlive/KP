/**
 * PilotDashboard — Variant B «Dagboken» (Tom-valgt 2026-08-10).
 *
 * Kontrakt (ALT er ekte data — ingen falsk UI):
 * - Status: GET /api/trading/sessions?status=active → AKTIV/STOPPET
 * - Gevinst + feed: GET /api/pilot (analytics + trades m/ pilot_explanation)
 * - Saldo: GET /api/user/profile → paper_balance
 * - START: POST /api/pilot { mode: "pilot", live: false }
 * - STOPP: PATCH /api/trading/sessions { all: true, mode: "paper", action: "stop" }
 * - 401 (utlogget) → login/register-prompt
 * - API-feil → ærlig feiltilstand med «Prøv igjen», ALDRI falsk suksess
 * - Feed uten pilot_explanation viser kun fakta (side/beløp/tid) — ingen
 *   fabrikkerte forklaringer
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => key,
}));

import PilotDashboard from "../PilotDashboard";

const realFetch = global.fetch;

interface MockOpts {
  authed?: boolean;
  aktiveSesjoner?: number;
  saldo?: number;
  totalPnl?: number;
  trades?: Array<{
    id: string;
    trading_pair: string;
    side: string;
    total_value: number;
    quantity: number;
    realized_pnl: number | null;
    pilot_explanation: string | null;
    created_at: string;
  }>;
  feiler?: boolean;
}

function mockApi({
  authed = true,
  aktiveSesjoner = 0,
  saldo = 100000,
  totalPnl = 0,
  trades = [],
  feiler = false,
}: MockOpts = {}) {
  global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (feiler) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
    if (!authed) return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });

    if (url === "/api/user/profile") {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ profile: { paper_balance: saldo, tier: "student" } }),
      });
    }
    if (String(url).startsWith("/api/trading/sessions") && !init?.method) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({
          sessions: Array.from({ length: aktiveSesjoner }, (_, i) => ({ id: `s${i}`, status: "active" })),
        }),
      });
    }
    if (url === "/api/pilot" && !init?.method) {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({
          analytics: { totalPnl, winRate: 0, totalTrades: trades.length, winningTrades: 0, losingTrades: 0, byCoin: [] },
          trades,
        }),
      });
    }
    if (url === "/api/pilot" && init?.method === "POST") {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, sessionIds: ["s9"], sessionCount: 1 }) });
    }
    if (String(url).startsWith("/api/trading/sessions") && init?.method === "PATCH") {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ updated: aktiveSesjoner }) });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

describe("PilotDashboard", () => {
  beforeEach(() => mockApi());
  afterEach(() => { global.fetch = realFetch; });

  it("viser STOPPET + START-knapp når ingen aktive sesjoner", async () => {
    render(<PilotDashboard />);
    expect(await screen.findByText("statusStopped")).toBeTruthy();
    expect(screen.getByRole("button", { name: /startKnapp/ })).toBeTruthy();
  });

  it("viser AKTIV + rød STOPP-knapp når sesjon kjører, med saldo og gevinst", async () => {
    mockApi({ aktiveSesjoner: 1, saldo: 99646, totalPnl: 412 });
    render(<PilotDashboard />);
    expect(await screen.findByText("statusActive")).toBeTruthy();
    expect(screen.getByRole("button", { name: /stoppKnapp/ })).toBeTruthy();
    expect(screen.getByTestId("pilot-saldo").textContent).toContain("99");
    expect(screen.getByTestId("pilot-gevinst").textContent).toContain("412");
  });

  it("feed viser ekte trades med forklaring — og ærlig tomtilstand uten", async () => {
    mockApi({
      trades: [{
        id: "t1", trading_pair: "SOLUSDT", side: "BUY", total_value: 1000,
        quantity: 0.5, realized_pnl: null,
        pilot_explanation: "Prisen falt, så jeg kjøpte billig.",
        created_at: new Date().toISOString(),
      }],
    });
    render(<PilotDashboard />);
    expect(await screen.findByText(/Prisen falt, så jeg kjøpte billig\./)).toBeTruthy();
    expect(screen.getByTestId("feed-belop-t1").textContent).toContain("1");
  });

  it("viser ærlig tomtilstand når det ikke finnes handler", async () => {
    mockApi({ trades: [] });
    render(<PilotDashboard />);
    expect(await screen.findByText(/feedEmptyTitle/)).toBeTruthy();
  });

  it("START-knapp poster til /api/pilot med mode=pilot, live=false og henter data på nytt", async () => {
    render(<PilotDashboard />);
    const knapp = await screen.findByRole("button", { name: /startKnapp/ });
    fireEvent.click(knapp);
    await waitFor(() => {
      const kall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const post = kall.find(([url, init]) => url === "/api/pilot" && (init as RequestInit)?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({ mode: "pilot", live: false });
    });
  });

  it("STOPP-knapp patcher bulk-stop på paper-sesjoner", async () => {
    mockApi({ aktiveSesjoner: 2 });
    render(<PilotDashboard />);
    const knapp = await screen.findByRole("button", { name: /stoppKnapp/ });
    fireEvent.click(knapp);
    await waitFor(() => {
      const kall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const patch = kall.find(([url, init]) => String(url).startsWith("/api/trading/sessions") && (init as RequestInit)?.method === "PATCH");
      expect(patch).toBeTruthy();
      expect(JSON.parse((patch![1] as RequestInit).body as string)).toEqual({ all: true, mode: "paper", action: "stop" });
    });
  });

  it("401 → login/register-prompt (ikke falsk dashboard-visning)", async () => {
    mockApi({ authed: false });
    render(<PilotDashboard />);
    expect(await screen.findByText(/loginTittel/)).toBeTruthy();
  });

  it("API-feil → ærlig feiltilstand med «Prøv igjen»", async () => {
    mockApi({ feiler: true });
    render(<PilotDashboard />);
    expect(await screen.findByText(/feilTittel/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /provIgjen/ })).toBeTruthy();
  });
});
