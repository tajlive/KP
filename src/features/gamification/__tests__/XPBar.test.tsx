import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { XPBar } from "../XPBar";

const mockUseGamification = vi.fn();

vi.mock("../GamificationProvider", () => ({
  useGamification: (...args: unknown[]) => mockUseGamification(...args),
}));

describe("XPBar", () => {
  it("returns null when gamification state is null", () => {
    mockUseGamification.mockReturnValue({ state: null });
    const { container } = render(<XPBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders level badge with current level", () => {
    mockUseGamification.mockReturnValue({
      state: { current_level: 3, total_xp: 250, current_streak: 0 },
    });
    render(<XPBar />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Lvl")).toBeInTheDocument();
  });

  it("renders XP progress text", () => {
    mockUseGamification.mockReturnValue({
      state: { current_level: 2, total_xp: 150, current_streak: 0 },
    });
    render(<XPBar />);
    // Level 2: previous threshold = 100, next = 400
    expect(screen.getByText("150 XP")).toBeInTheDocument();
    expect(screen.getByText("400 XP")).toBeInTheDocument();
  });

  it("shows streak flame when streak > 0", () => {
    mockUseGamification.mockReturnValue({
      state: { current_level: 1, total_xp: 50, current_streak: 5 },
    });
    render(<XPBar />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("hides streak when streak is 0", () => {
    mockUseGamification.mockReturnValue({
      state: { current_level: 1, total_xp: 50, current_streak: 0 },
    });
    const { container } = render(<XPBar />);
    expect(container.querySelector("[class*='animate-\\[pulse']")).toBeNull();
  });

  it("calculates percentage correctly for level 1", () => {
    mockUseGamification.mockReturnValue({
      state: { current_level: 1, total_xp: 50, current_streak: 0 },
    });
    render(<XPBar />);
    // Level 1: floor=0, next=100, xpInLevel=50, percentage=50%
    expect(screen.getByText("50 XP")).toBeInTheDocument();
    expect(screen.getByText("100 XP")).toBeInTheDocument();
  });
});
