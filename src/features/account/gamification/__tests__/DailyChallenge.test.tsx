import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyChallenge } from "../DailyChallenge";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
}));

const mockStats = {
  points: 2450,
  rank: 42,
  streak: 5,
  challenges: [
    {
      id: "w",
      title: "Vinnende streak",
      description: "3 handler",
      current: 1,
      target: 3,
      reward: 500,
      completed: false,
    },
    {
      id: "e",
      title: "Utforsk strategi",
      description: "Ny strategi",
      current: 0,
      target: 1,
      reward: 300,
      completed: false,
    },
    {
      id: "d",
      title: "Daglig login",
      description: "Dashboard",
      current: 1,
      target: 1,
      reward: 100,
      completed: true,
    },
  ],
};

beforeEach(() => {
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(mockStats) });
});

describe("DailyChallenge", () => {
  it("renders header", async () => {
    render(<DailyChallenge userId="t" />);
    expect(await screen.findByText("Dagens utfordringer")).toBeInTheDocument();
  });

  it("renders timer", async () => {
    render(<DailyChallenge userId="t" />);
    expect(await screen.findByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("renders 3 challenges", async () => {
    render(<DailyChallenge userId="t" />);
    await screen.findByText("Daglig login");
    expect(screen.getByText("Vinnende streak")).toBeInTheDocument();
    expect(screen.getByText("Utforsk strategi")).toBeInTheDocument();
  });

  it("shows check for completed", async () => {
    render(<DailyChallenge userId="t" />);
    await screen.findByText("Daglig login");
    expect(screen.getAllByText("✓").length).toBe(1);
  });

  it("renders stats", async () => {
    const { container } = render(<DailyChallenge userId="t" />);
    // Wait for stats to load by waiting for the rank to appear
    await screen.findByText("#42");
    expect(container.textContent).toMatch(/2[,\s]?450/);
  });

  it("shows leaderboard button", async () => {
    render(<DailyChallenge userId="t" />);
    expect(await screen.findByText("Se topplisten")).toBeInTheDocument();
  });

  it("shows rewards", async () => {
    render(<DailyChallenge userId="t" />);
    await screen.findByText("Daglig login");
    expect(screen.getByText("+500")).toBeInTheDocument();
    expect(screen.getByText("+300")).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();
  });
});
