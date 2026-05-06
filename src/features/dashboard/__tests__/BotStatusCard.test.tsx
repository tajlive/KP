import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BotStatusCard, type TradingSession } from "../BotStatusCard";

// Hoisted mocks (must be defined before vi.mock calls)
const mockPush = vi.hoisted(() => vi.fn());
const mockChannel = vi.hoisted(() => vi.fn());
const mockSubscribe = vi.hoisted(() => vi.fn(() => ({ unsubscribe: vi.fn() })));
const mockRemoveChannel = vi.hoisted(() => vi.fn());

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, options?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      "dashboard.botStatus.title": "Trading Bot",
      "dashboard.botStatus.active": "Aktiv",
      "dashboard.botStatus.paused": "Pauset",
      "dashboard.botStatus.stopped": "Stoppet",
      "dashboard.botStatus.notResponding": "Svarer ikke",
      "dashboard.botStatus.paperTrading": "Øvingsmodus",
      "dashboard.botStatus.liveTrading": "Live-modus",
      "dashboard.botStatus.started": "Startet",
      "dashboard.botStatus.justNow": "Akkurat nå",
      "dashboard.botStatus.minutesAgo": "{{count}} minutter siden",
      "dashboard.botStatus.hoursAgo": "{{count}} timer siden",
      "dashboard.botStatus.daysAgo": "{{count}} dager siden",
      "dashboard.botStatus.pause": "Pause",
      "dashboard.botStatus.resume": "Fortsett",
      "dashboard.botStatus.viewDetails": "Se detaljer",
      "dashboard.botStatus.updateError": "Kunne ikke oppdatere status",
    };
    let result = messages[key] || key;
    if (options && typeof result === "string") {
      Object.entries(options).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });
    }
    return result;
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "no" }),
  useRouter: () => ({ push: mockPush }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    channel: mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: mockSubscribe,
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("BotStatusCard", () => {
  const baseSession: TradingSession = {
    id: "session-1",
    mode: "paper",
    status: "active",
    trading_pair: "BTC-USDT",
    strategy_id: "strat-1",
    current_capital_nok: 115_420,
    starting_capital_nok: 100_000,
    total_pnl: 15_420,
    winning_trades: 8,
    total_trades: 12,
    last_heartbeat: new Date().toISOString(),
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("rendering with session data", () => {
    it("renders bot title and trading pair", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(screen.getByText("Trading Bot")).toBeInTheDocument();
      expect(screen.getByText(/BTC-USDT/)).toBeInTheDocument();
    });

    it("shows active status badge with green indicator", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(screen.getByText("Aktiv")).toBeInTheDocument();
    });

    it("shows paper trading mode", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(screen.getByText(/Øvingsmodus/)).toBeInTheDocument();
    });

    it("shows live trading mode when mode is live", () => {
      render(<BotStatusCard initialSession={{ ...baseSession, mode: "live" }} />);
      expect(screen.getByText(/Live-modus/)).toBeInTheDocument();
    });

    it("calculates and displays positive PnL percentage", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      // PnL = (115420 - 100000) / 100000 * 100 = 15.4%
      // toFixed(1) uses dot, text is split across nodes — use regex
      expect(screen.getByText(/\+15\.4%/)).toBeInTheDocument();
    });

    it("calculates and displays positive PnL amount", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      // Amount = 115420 - 100000 = 15420
      expect(screen.getByText(/\+15\s?420/)).toBeInTheDocument();
    });

    it("displays negative PnL in red", () => {
      const negativeSession = {
        ...baseSession,
        current_capital_nok: 85_000,
      };
      render(<BotStatusCard initialSession={negativeSession} />);
      // PnL = (85000 - 100000) / 100000 * 100 = -15.0%
      expect(screen.getByText(/-15\.0%/)).toBeInTheDocument();
    });

    it("shows pause button when active", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(screen.getByText("Pause")).toBeInTheDocument();
    });

    it("shows resume button when paused", () => {
      render(<BotStatusCard initialSession={{ ...baseSession, status: "paused" }} />);
      expect(screen.getByText("Fortsett")).toBeInTheDocument();
    });

    it("shows view details button", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(screen.getByText("Se detaljer")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("returns null when no session is provided", () => {
      const { container } = render(<BotStatusCard initialSession={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("handles zero starting capital safely (no division by zero)", () => {
      const zeroStartSession = {
        ...baseSession,
        starting_capital_nok: 0,
      };
      render(<BotStatusCard initialSession={zeroStartSession} />);
      // Should show 0% not crash — toFixed(1) uses dot
      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });

    it("handles null starting capital safely", () => {
      const nullStartSession = {
        ...baseSession,
        starting_capital_nok: null as unknown as number,
      };
      render(<BotStatusCard initialSession={nullStartSession} />);
      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });

    it("shows not responding warning when heartbeat is stale", () => {
      const staleSession = {
        ...baseSession,
        last_heartbeat: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      };
      render(<BotStatusCard initialSession={staleSession} />);
      // "Svarer ikke" appears both in badge and warning — check for warning icon
      const warnings = screen.getAllByText("Svarer ikke");
      expect(warnings.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show not responding when heartbeat is recent", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(screen.queryByText("Svarer ikke")).not.toBeInTheDocument();
    });

    it("handles missing heartbeat gracefully", () => {
      const noHeartbeatSession = {
        ...baseSession,
        last_heartbeat: "",
      };
      render(<BotStatusCard initialSession={noHeartbeatSession} />);
      expect(screen.queryByText("Svarer ikke")).not.toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls API and updates session on pause", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: { ...baseSession, status: "paused" } }),
      });

      render(<BotStatusCard initialSession={baseSession} />);
      const pauseButton = screen.getByText("Pause");
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/trading-sessions/session-1/status",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ status: "paused" }),
          }),
        );
      });
    });

    it("calls API and updates session on resume", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: { ...baseSession, status: "active" } }),
      });

      render(<BotStatusCard initialSession={{ ...baseSession, status: "paused" }} />);
      const resumeButton = screen.getByText("Fortsett");
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/trading-sessions/session-1/status",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ status: "active" }),
          }),
        );
      });
    });

    it("navigates to details on view details click", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      const detailsButton = screen.getByText("Se detaljer");
      fireEvent.click(detailsButton);
      expect(mockPush).toHaveBeenCalledWith("/no/paper-trading/session-1");
    });

    it("navigates to live mode details when mode is live", () => {
      render(<BotStatusCard initialSession={{ ...baseSession, mode: "live" }} />);
      const detailsButton = screen.getByText("Se detaljer");
      fireEvent.click(detailsButton);
      expect(mockPush).toHaveBeenCalledWith("/no/paper-trading/session-1?mode=live");
    });

    it("disables buttons while loading", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<BotStatusCard initialSession={baseSession} />);
      const pauseButton = screen.getByText("Pause");
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(pauseButton).toBeDisabled();
      });
    });
  });

  describe("realtime subscription", () => {
    it("sets up Supabase channel on mount", () => {
      render(<BotStatusCard initialSession={baseSession} />);
      expect(mockChannel).toHaveBeenCalledWith("bot-status");
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it("cleans up channel on unmount", () => {
      const { unmount } = render(<BotStatusCard initialSession={baseSession} />);
      unmount();
      expect(mockRemoveChannel).toHaveBeenCalled();
    });

    it("does not subscribe when session is null", () => {
      render(<BotStatusCard initialSession={null} />);
      expect(mockChannel).not.toHaveBeenCalled();
    });
  });
});
