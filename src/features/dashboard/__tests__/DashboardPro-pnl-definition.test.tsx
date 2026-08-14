import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next-intl før komponent-import
vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// Mock next/navigation — PaperTradingList (rendres i samme grid som
// StatsGrid) kaller useRouter; uten mock krasjer den → WidgetErrorBoundary
// fanger HELE grid-et og StatsGrid forsvinner (test-feil, ikke prod-feil).
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/no/dashboard",
  useParams: () => ({ locale: "no" }),
  useSearchParams: () => new URLSearchParams(),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Fiks 8-regresjon: Avkastning må komme fra EKTE trading-P&L (totalPnl),
// ikke konto-differansen (accountBalance − startingCapital) som inkluderer
// manuelle justeringer og lyver som «avkastning».
// Observert i prod: konto +138 210 kr (238 210 − 100 000) men trades −830 kr.
describe("DashboardPro avkastningsdefinisjon (FIKS 8)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it(
    "returnerer totalReturn basert på totalPnl, ikke konto-differanse",
    { timeout: 90_000 },
    async () => {
      // Dynamisk import etter mock — henter komponenten
      const mod = await import("../DashboardPro");
      const { DashboardPro } = mod;

      // Stats med konto-differanse +138 210 kr men ekte P&L −830 kr
      const stats = {
        totalTrades: 49,
        totalPnl: -830.02,
        winningTrades: 0,
        sessionCount: 23,
        currentCapital: 133821,
        startingCapital: 100000,
        accountBalance: 238210.17,
        investedCapital: 412.3,
        recentSessions: [],
      };

      render(<DashboardPro stats={stats} preferredTradingMode="paper" />);

      // Total verdi = ledig + investert (238 210.17 + 412.30 = 238 622)
      // Hero-balansen vises som «238 622 kr» — totalen, ikke bare ledig.
      // Vises både i hero og StatsGrid-kortet → getAllByText (minst 1).
      expect(screen.getAllByText(/238 622/).length).toBeGreaterThan(0);

      // Avkastningsprosenten må være −0.83 % (totalPnl/startingCapital),
      // IKKE +138.21 % (konto-differansen) — det var løgnen.
      expect(screen.getByText(/-0\.83%/)).toBeTruthy();
      expect(screen.queryByText(/\+138\.21%/)).toBeNull();
    },
  );

  it(
    "viser ekte P&L i stedet for konto-differanse",
    { timeout: 90_000 },
    async () => {
      const mod = await import("../DashboardPro");
      const { DashboardPro } = mod;

      const stats = {
        totalTrades: 49,
        totalPnl: -830.02,
        winningTrades: 0,
        sessionCount: 23,
        currentCapital: 133821,
        startingCapital: 100000,
        accountBalance: 238210.17,
        investedCapital: 0,
        recentSessions: [],
      };

      render(<DashboardPro stats={stats} preferredTradingMode="paper" />);

      // StatsGrid «Total avkastning» = −830 kr (RPC total_pnl).
      // Vises i hero og StatsGrid avhengig av render-timing → getAllByText.
      expect(screen.getAllByText(/-830/).length).toBeGreaterThan(0);
    },
  );
});
