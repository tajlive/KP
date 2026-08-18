import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CompetitionClient from "../CompetitionClient";

const mockPush = vi.fn();
const mockStartAutoTrade = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    (ns: string) => (key: string, _params?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        title: "Trading Konkurranse",
        subtitle: "Konkurrer og vinn",
        yourPosition: "Din posisjon",
        notParticipating: "Du deltar ikke ennå",
        startFirstTrade: "Start din første trade",
        leaderboard: "Toppliste",
        weekly: "Ukentlig",
        monthly: "Månedlig",
        allTime: "Totalt",
        loading: "Laster...",
        risk: "risiko",
        trades: "handler",
        winRate: "Win rate",
        return: "Avkastning",
        copy: "Kopier",
        copyStrategy: "Kopier {name}s strategi?",
        copyStrategyDesc: "Risikonivå: {risk}",
        copyError: "Kunne ikke kopiere strategi",
        howToWin: "Hvordan vinne",
        howToWinDesc: "Beskrivelse",
        whatIsCopying: "Hva er kopiering?",
        whatIsCopyingDesc: "Beskrivelse",
        weeklyPrize: "Ukentlig premie",
        monthlyPrize: "Månedlig premie",
        noActive: "Ingen aktive tradere",
      };
      return messages[key] || key;
    },
  useLocale: () => "no",
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Supabase
vi.mock("@/lib/utils", () => ({
  createClient: () => ({
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "user-123", email: "test@test.com" } },
        }),
    },
  }),
  cn: (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" "),
}));

// Mock konkurranse-datoer (2026-08-19): august-konkurransen er over
// (COMPETITION_END=2026-08-15) — komponenten viser «ended»-state. Disse
// testene forutsetter en AKTIV konkurranse (join-CTA) og må være
// tidsuavhengige, ellers feiler de hver gang sesongen ruller over.
vi.mock("@/lib/competition", () => ({
  COMPETITION_ID: "2026-08",
  COMPETITION_START: new Date("2026-08-01T00:00:00+02:00"),
  COMPETITION_END: new Date("2099-01-01T00:00:00+02:00"),
}));

// Mock paper-trading supabase
vi.mock("@/lib/paper-trading/supabase", () => ({
  getLeaderboard: vi.fn(),
  getUserRank: vi.fn(),
}));

// Mock usePaperTrading
vi.mock("@/hooks/usePaperTrading", () => ({
  usePaperTrading: () => ({
    startAutoTrade: mockStartAutoTrade,
    loading: false,
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

import { getLeaderboard, getUserRank } from "@/lib/paper-trading/supabase";

describe("CompetitionClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with title", () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue(null);

    render(<CompetitionClient params={{ locale: "no" }} />);
    expect(screen.getByText("Trading Konkurranse")).toBeInTheDocument();
  });

  it("shows loading skeleton initially", () => {
    vi.mocked(getLeaderboard).mockImplementation(() => new Promise(() => {}));
    vi.mocked(getUserRank).mockImplementation(() => new Promise(() => {}));

    render(<CompetitionClient params={{ locale: "no" }} />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows empty state when no leaderboard data", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue(null);

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("Ingen aktive tradere")).toBeInTheDocument();
    });
  });

  it("shows user rank card when user has rank", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue({
      id: "r1",
      rank: 5,
      user_display_name: "Test User",
      return_pct: 23.5,
      win_rate: 65,
      total_trades: 12,
      risk_level: "medium",
      sharpe_ratio: 1.5,
      period: "weekly",
      user_id: "user-123",
      simulation_id: "sim1",
      created_at: new Date().toISOString(),
      is_public: true,
      avatar_url: null,
      previous_rank: 6,
    });

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("#5")).toBeInTheDocument();
      expect(screen.getByText(/\+23\.50%/)).toBeInTheDocument();
    });
  });

  it("shows 'not participating' card when no user rank", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue(null);

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("Du deltar ikke ennå")).toBeInTheDocument();
      expect(screen.getByText("Start din første trade")).toBeInTheDocument();
    });
  });

  it("switches timeframe on button click", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([
      {
        id: "1",
        rank: 1,
        user_display_name: "Erik T.",
        return_pct: 15.5,
        win_rate: 70,
        total_trades: 20,
        risk_level: "high",
        sharpe_ratio: 1.2,
        period: "weekly",
        user_id: "u1",
        simulation_id: "s1",
        created_at: new Date().toISOString(),
        is_public: true,
        avatar_url: null,
        previous_rank: 2,
      },
    ]);
    vi.mocked(getUserRank).mockResolvedValue(null);

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("Erik T.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Månedlig"));
    await waitFor(() => {
      expect(getLeaderboard).toHaveBeenCalledWith("monthly");
    });

    fireEvent.click(screen.getByText("Totalt"));
    await waitFor(() => {
      expect(getLeaderboard).toHaveBeenCalledWith("all_time");
    });
  });

  it("calls startAutoTrade when copying a strategy", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([
      {
        id: "1",
        rank: 1,
        user_display_name: "Erik T.",
        return_pct: 15.5,
        win_rate: 70,
        total_trades: 20,
        risk_level: "high",
        sharpe_ratio: 1.2,
        period: "weekly",
        user_id: "u1",
        simulation_id: "s1",
        created_at: new Date().toISOString(),
        is_public: true,
        avatar_url: null,
        previous_rank: 2,
      },
    ]);
    vi.mocked(getUserRank).mockResolvedValue(null);
    window.confirm = vi.fn(() => true);
    mockStartAutoTrade.mockResolvedValue(undefined);

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("Erik T.")).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByText("Kopier");
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(mockStartAutoTrade).toHaveBeenCalledWith("high");
      expect(mockPush).toHaveBeenCalledWith("/no/dashboard/auto-trade");
    });
  });

  it("shows error toast when copy fails", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([
      {
        id: "1",
        rank: 1,
        user_display_name: "Erik T.",
        return_pct: 15.5,
        win_rate: 70,
        total_trades: 20,
        risk_level: "high",
        sharpe_ratio: 1.2,
        period: "weekly",
        user_id: "u1",
        simulation_id: "s1",
        created_at: new Date().toISOString(),
        is_public: true,
        avatar_url: null,
        previous_rank: 2,
      },
    ]);
    vi.mocked(getUserRank).mockResolvedValue(null);
    window.confirm = vi.fn(() => true);
    mockStartAutoTrade.mockRejectedValue(new Error("Failed"));

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("Erik T.")).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByText("Kopier");
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Kunne ikke kopiere strategi",
      );
    });
  });

  it("renders info cards at bottom", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue(null);

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("Hvordan vinne")).toBeInTheDocument();
      expect(screen.getByText("Hva er kopiering?")).toBeInTheDocument();
      expect(screen.getByText("Premier")).toBeInTheDocument();
    });
  });

  it("shows join CTA when user has not joined", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              String(url).includes("display-name")
                ? { display_name: "RaskRev", suggestion: "" }
                : { joined: false, participants: 10 },
            ),
        }),
      ),
    );

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("joinCta")).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });

  it("shows joined badge after successful join", async () => {
    vi.mocked(getLeaderboard).mockResolvedValue([]);
    vi.mocked(getUserRank).mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              String(url).includes("display-name")
                ? { display_name: "RaskRev", suggestion: "" }
                : init?.method === "POST"
                  ? { joined: true, participants: 11 }
                  : { joined: false, participants: 10 },
            ),
        }),
      ),
    );

    render(<CompetitionClient params={{ locale: "no" }} />);

    await waitFor(() => {
      expect(screen.getByText("joinCta")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("joinCta"));

    await waitFor(() => {
      expect(screen.getByText(/joinedBadge/)).toBeInTheDocument();
      expect(mockToastSuccess).toHaveBeenCalledWith("joinSuccess");
    });
    vi.unstubAllGlobals();
  });
});
