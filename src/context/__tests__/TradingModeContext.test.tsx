/**
 * TradingModeContext — modus-synk fra profil (Task 1, «Ingen data»-fiks).
 *
 * Kontrakt:
 * 1. Ved mount henter provideren /api/trading/mode og overstyrer initialMode
 *    (layout-gjetningen) med profilens faktiske modus.
 * 2. Denne synken er IKKE et aktivt bruker-bytte → userSwitched forblir false.
 * 3. Klikk på toggle (setMode) → userSwitched = true (DashboardContent skal
 *    da hente nye metrics for den valgte modusen).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { TradingModeProvider, useTradingMode } from "../TradingModeContext";

// next-intl krever provider — mock useTranslations
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

function Probe() {
  const { mode, userSwitched, setMode } = useTradingMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="switched">{String(userSwitched)}</span>
      <button data-testid="to-live" onClick={() => setMode("live")}>
        bytt
      </button>
    </div>
  );
}

describe("TradingModeProvider — profil-synk", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, mode: "live" }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("synker modus fra /api/trading/mode ved mount (live slår initialMode=paper)", async () => {
    render(
      <TradingModeProvider initialMode="paper">
        <Probe />
      </TradingModeProvider>,
    );
    // Før synk: initialMode
    expect(screen.getByTestId("mode").textContent).toBe("paper");
    await waitFor(() =>
      expect(screen.getByTestId("mode").textContent).toBe("live"),
    );
    expect(fetch).toHaveBeenCalledWith("/api/trading/mode", {
      credentials: "same-origin",
    });
  });

  it("server-synk er IKKE et bruker-bytte (userSwitched forblir false)", async () => {
    render(
      <TradingModeProvider initialMode="paper">
        <Probe />
      </TradingModeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("mode").textContent).toBe("live"),
    );
    expect(screen.getByTestId("switched").textContent).toBe("false");
  });

  it("aktiv toggle via setMode setter userSwitched=true", async () => {
    render(
      <TradingModeProvider initialMode="paper">
        <Probe />
      </TradingModeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("mode").textContent).toBe("live"),
    );
    await act(async () => {
      screen.getByTestId("to-live").click();
    });
    expect(screen.getByTestId("switched").textContent).toBe("true");
  });

  it("nettverksfeil → beholder initialMode (stille fallback)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(
      <TradingModeProvider initialMode="paper">
        <Probe />
      </TradingModeProvider>,
    );
    // Gi effekten tid til å feile
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByTestId("mode").textContent).toBe("paper");
  });
});
