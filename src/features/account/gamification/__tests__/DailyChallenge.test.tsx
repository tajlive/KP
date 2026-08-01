import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyChallenge } from "../DailyChallenge";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: { children: React.ReactNode; className?: string }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

// Mock useAuth - return null user (viser 0/empty)
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Mock fetch for /api/gamification/stats
const mockStats = {
  points: 2450,
  rank: 42,
  streak: 5,
  challenges: [
    { id: "winning_streak", title: "Vinnende streak", description: "Gjennomfør 3 handler", current: 1, target: 3, reward: 500, completed: false },
    { id: "explore_strategy", title: "Utforsk strategi", description: "Prøv en ny strategi", current: 0, target: 1, reward: 300, completed: false },
    { id: "daily_login", title: "Daglig login", description: "Besøk dashboardet", current: 1, target: 1, reward: 100, completed: true },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockStats),
  });
});

describe("DailyChallenge", () => {
  it("renders header with title", async () => {
    render(<DailyChallenge userId="test-user" />);
    expect(await screen.findByText("Dagens utfordringer")).toBeInTheDocument();
    expect(screen.getByText("Fullfør for bonuspoeng")).toBeInTheDocument();
  });

  it("renders countdown timer", async () => {
    render(<DailyChallenge userId="test-user" />);
    const timer = await screen.findByText(/\d{2}:\d{2}:\d{2}/);
    expect(timer).toBeInTheDocument();
  });

  it("renders all 3 challenges from API", async () => {
    render(<DailyChallenge userId="test-user" />);
    expect(await screen.findByText("Vinnende streak")).toBeInTheDocument();
    expect(screen.getByText("Utforsk strategi")).toBeInTheDocument();
    expect(screen.getByText("Daglig login")).toBeInTheDocument();
  });

  it("shows completed challenge with checkmark", async () => {
    render(<DailyChallenge userId="test-user" />);
    expect(await screen.findByText("✓ Fullført")).toBeInTheDocument();
  });

  it("renders stats row with points, rank, and streak from API", async () => {
    const { container } = render(<DailyChallenge userId="test-user" />);
    await screen.findByText("Dine poeng");
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Rangering")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Dagers streak")).toBeInTheDocument();
    // points.toLocaleString: 2,450 eller 2 450
    expect(container.textContent).toMatch(/2[,\s]?450/);
  });

  it("shows leaderboard link", async () => {
    render(<DailyChallenge userId="test-user" />);
    expect(await screen.findByText("Se topplisten")).toBeInTheDocument();
  });

  it("shows reward points for each challenge", async () => {
    render(<DailyChallenge userId="test-user" />);
    await screen.findByText("Vinnende streak");
    expect(screen.getByText("+500")).toBeInTheDocument();
    expect(screen.getByText("+300")).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();
  });
});
