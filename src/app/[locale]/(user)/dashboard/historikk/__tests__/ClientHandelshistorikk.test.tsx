import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "title": "Handelshistorikk",
      "subtitle": "Dine handler",
      "filterAll": "Alle",
      "filterPaper": "Paper",
      "filterLive": "Live",
      "totalTrades": "Totalt",
      "wins": "Vunnet",
      "losses": "Tap",
      "totalRealizedPnl": "Real. PnL",
      "notLoggedIn": "Du må logge inn",
      "fetchError": "Kunne ikke laste",
      "retry": "Prøv igjen",
      "noTrades": "Ingen handler",
      "noTradesHint": "Du har ingen handler ennå",
      "noTradesFiltered": "Ingen treff",
      "noTradesFilteredHint": "Prøv et annet filter",
      "decisionLogTitle": "Beslutningslogg",
      "decisionLogHint": "Logg fra trading-roboten",
      "decisionsEmpty": "Ingen beslutninger",
      "decisionAllow": "Tillat",
      "decisionReject": "Avslå",
      "decisionModify": "Endre",
      "live": "Live",
      "paper": "Paper",
      "integrityPollWarning": "Advarsel om dataintegritet",
      "copyDiagnostics": "Kopier diagnostikk",
      "diagnosticsCopyFailed": "Feil ved kopiering",
      "diagnosticsCopied": "Kopiert!",
      "exportCsv": "Eksporter CSV",
      "buy": "Kjøp",
      "sell": "Selg",
      "whyMissing": "—",
      "noRealizedPnlShort": "—",
      "noRealizedPnlExplainer": "Ikke realisert",
      "tradeHistory.errorTitle": "Feil",
      "tradeHistory.errorDescription": "Noe gikk galt",
      "trading.tradeHistory.errorTitle": "Feil",
      "trading.tradeHistory.errorDescription": "Noe gikk galt",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@/features/trading/PremiumTradingLayout", () => ({
  PremiumTradingShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PremiumTradingHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  PremiumStatusBanner: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PremiumPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("../TradeHistoryStatCard", () => ({
  TradeHistoryStatCard: ({ label, value }: { label: string; value: string }) => (
    <div>
      {label}: {value}
    </div>
  ),
}));

vi.mock("@/lib/bot-status-helpers", () => ({
  explainStrategySignalJson: vi.fn(() => null),
}));

vi.mock("@/lib/trading/me-trades-api", () => ({
  meTradesSuccessSchema: {
    safeParse: vi.fn((json: unknown) => ({ success: true, data: json })),
  },
}));

vi.mock("@/lib/sentry", () => ({
  reportTradeHistoryEmptyWhileSignedIn: vi.fn(),
  reportTradingIntegrityPollFailure: vi.fn(),
}));

vi.mock("@/lib/trading/trading-integrity-sync", () => ({
  tradesPollIntervalAfterFailures: vi.fn(() => 30000),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatByMode: (n: number) => `${n.toFixed(2)} kr`,
  }),
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import ClientHandelshistorikk from "../ClientHandelshistorikk";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ClientHandelshistorikk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<ClientHandelshistorikk />);
    expect(screen.getByText("Handelshistorikk")).toBeInTheDocument();
  });

  it("shows not logged in message on 401", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/user/trades") || url.includes("/api/user/trade-decisions")) {
        return Promise.resolve(jsonResponse({ ok: false, error: "Unauthorized" }, 401));
      }
      return Promise.reject(new Error(`unexpected URL: ${url}`));
    });

    render(<ClientHandelshistorikk />);

    await waitFor(() => {
      expect(screen.getByText("Du må logge inn")).toBeInTheDocument();
    });
  });

  it("renders trades and decisions when authenticated", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/user/trades")) {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            trades: [
              {
                id: "t1",
                trading_pair: "BTCUSDT",
                side: "buy",
                quantity: 0.1,
                price: 60000,
                total_value: 6000,
                realized_pnl: 500,
                mode: "paper",
                status: "filled",
                created_at: "2026-01-01T00:00:00Z",
                executed_at: "2026-01-01T00:00:00Z",
                strategy_signal: null,
              },
            ],
            diagnostic_id: "d1",
          }),
        );
      }
      if (url.includes("/api/user/trade-decisions")) {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            decisions: [
              {
                id: "dd1",
                decision_type: "allow",
                trading_mode: "paper",
                symbol: "ETHUSDT",
                side: "buy",
                requested_quantity: 1,
                requested_price: 3000,
                rejection_reason: null,
                created_at: "2026-01-01T00:00:00Z",
              },
            ],
            limit: 50,
          }),
        );
      }
      return Promise.reject(new Error(`unexpected URL: ${url}`));
    });

    render(<ClientHandelshistorikk />);

    await waitFor(() => {
      expect(screen.getByText("Handelshistorikk")).toBeInTheDocument();
      // BTC rendres både i mobil-kortlisten og desktop-tabellen
      expect(screen.getAllByText("BTC").length).toBeGreaterThan(0);
      expect(screen.getByText("ETH")).toBeInTheDocument();
    });
  });

  it("renders empty state when authenticated but no trades", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/user/trades")) {
        return Promise.resolve(jsonResponse({ ok: true, trades: [], diagnostic_id: "d1" }));
      }
      if (url.includes("/api/user/trade-decisions")) {
        return Promise.resolve(jsonResponse({ ok: true, decisions: [], limit: 50 }));
      }
      return Promise.reject(new Error(`unexpected URL: ${url}`));
    });

    render(<ClientHandelshistorikk />);

    await waitFor(() => {
      expect(screen.getByText("Ingen handler")).toBeInTheDocument();
    });
  });
});
