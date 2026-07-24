import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UpgradeGate } from "../UpgradeGate";

const mockPush = vi.fn();

// Komponenten bruker server-APIer (KLA-auth):
// /api/user/profile (401 = utlogget) + /api/user/trading-analytics
let mockAuthed = true;
let mockProfile = { tier: "student", paper_balance: 100000 };
let mockAnalytics = {
  tradeCount: 5,
  aggregates: { winRateRealizedPct: 66.7, totalRealizedPnl: 1300 },
};

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "no",
}));

// Mock fetch
global.fetch = vi.fn();

// Mock framer-motion (forenkle for testing)
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock localizedPathname
vi.mock("@/middleware/locale-path", () => ({
  localizedPathname: (_locale: string, path: string) => path,
}));

describe("UpgradeGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthed = true;
    mockProfile = { tier: "student", paper_balance: 100000 };
    mockAnalytics = {
      tradeCount: 5,
      aggregates: { winRateRealizedPct: 66.7, totalRealizedPnl: 1300 },
    };

    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/user/profile")) {
        return Promise.resolve(
          mockAuthed
            ? ({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ profile: mockProfile }),
              } as unknown as Response)
            : ({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: "Ikke innlogget" }),
              } as unknown as Response),
        );
      }
      // /api/user/trading-analytics
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockAnalytics),
      } as unknown as Response);
    });
  });

  it("renders children regardless of gate state", async () => {
    render(
      <UpgradeGate>
        <div data-testid="child-content">Child content</div>
      </UpgradeGate>
    );
    await waitFor(() => {
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });
  });

  it("shows upgrade gate when user has enough trades and is student", async () => {
    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Du er klar for ekte trading/i)).toBeInTheDocument();
    });
  });

  it("does NOT show gate when user tier is not student", async () => {
    mockProfile = { tier: "bachelor", paper_balance: 100000 };

    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Du er klar for ekte trading/i)).not.toBeInTheDocument();
    });
  });

  it("does NOT show gate when user has fewer trades than trigger", async () => {
    mockAnalytics.tradeCount = 2;

    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Du er klar for ekte trading/i)).not.toBeInTheDocument();
    });
  });

  it("does NOT show gate when user is not logged in", async () => {
    mockAuthed = false;

    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Du er klar for ekte trading/i)).not.toBeInTheDocument();
    });
  });

  it("navigates to pricing page when CTA is clicked", async () => {
    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Start live trading/i)).toBeInTheDocument();
    });

    screen.getByText(/Start live trading/i).click();
    expect(mockPush).toHaveBeenCalledWith("/priser");
  });

  it("closes gate when dismiss button is clicked", async () => {
    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Fortsett med lekepenger/i)).toBeInTheDocument();
    });

    screen.getByText(/Fortsett med lekepenger/i).click();
    await waitFor(() => {
      expect(screen.queryByText(/Du er klar for ekte trading/i)).not.toBeInTheDocument();
    });
  });

  it("calculates win rate correctly", async () => {
    // 2 av 4 vinnere = 50% (fra /api/user/trading-analytics)
    mockAnalytics.aggregates.winRateRealizedPct = 50;

    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Win rate/i)).toBeInTheDocument();
    });
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
