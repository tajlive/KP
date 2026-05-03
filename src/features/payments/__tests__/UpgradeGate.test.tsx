import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UpgradeGate } from "../UpgradeGate";

const mockPush = vi.fn();
let mockUser: { id: string; email: string } | null = { id: "user-123", email: "test@test.com" };
let mockProfile = { tier: "student", paper_balance: 100000 };
let mockTradesCount = 5;
let mockTrades: Array<{ realized_pnl: number }> = [{ realized_pnl: 1000 }, { realized_pnl: -200 }, { realized_pnl: 500 }];

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "no",
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: mockUser } }),
    },
    from: (table: string) => ({
      select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count === "exact" && opts?.head) {
          return { eq: () => Promise.resolve({ count: mockTradesCount }) };
        }
        return {
          eq: () => ({
            single: () => Promise.resolve({ data: mockProfile }),
            limit: () => Promise.resolve({ data: mockTrades }),
          }),
        };
      },
    }),
  }),
}));

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
    mockUser = { id: "user-123", email: "test@test.com" };
    mockProfile = { tier: "student", paper_balance: 100000 };
    mockTradesCount = 5;
    mockTrades = [
      { realized_pnl: 1000 },
      { realized_pnl: -200 },
      { realized_pnl: 500 },
    ];
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
    mockTradesCount = 5;
    mockProfile = { tier: "student", paper_balance: 100000 };

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
    mockTradesCount = 5;

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
    mockTradesCount = 2;
    mockProfile = { tier: "student", paper_balance: 100000 };

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
    mockUser = null;

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
    mockTradesCount = 5;
    mockProfile = { tier: "student", paper_balance: 100000 };

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
    mockTradesCount = 5;
    mockProfile = { tier: "student", paper_balance: 100000 };

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
    mockTradesCount = 5;
    mockProfile = { tier: "student", paper_balance: 100000 };
    mockTrades = [
      { realized_pnl: 1000 },
      { realized_pnl: -200 },
      { realized_pnl: 500 },
      { realized_pnl: 0 },
    ];

    render(
      <UpgradeGate>
        <div>Child</div>
      </UpgradeGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Win rate/i)).toBeInTheDocument();
    });
    // 2 av 4 trades er positive = 50%
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
