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

describe("DailyChallenge", () => {
  it("renders header with title", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("Dagens utfordringer")).toBeInTheDocument();
    expect(screen.getByText("Fullfør for bonuspoeng")).toBeInTheDocument();
  });

  it("renders countdown timer", () => {
    render(<DailyChallenge />);
    const timer = screen.getByText(/\d{2}:\d{2}:\d{2}/);
    expect(timer).toBeInTheDocument();
  });

  it("renders all 3 challenges", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("Vinnende streak")).toBeInTheDocument();
    expect(screen.getByText("Utforsk strategi")).toBeInTheDocument();
    expect(screen.getByText("Daglig login")).toBeInTheDocument();
  });

  it("shows completed challenge with checkmark", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("✓ Fullført")).toBeInTheDocument();
  });

  it("shows incomplete challenges without checkmark", () => {
    render(<DailyChallenge />);
    const completedLabels = screen.getAllByText("✓ Fullført");
    expect(completedLabels.length).toBe(1); // Only "Daglig login" is completed
  });

  it("renders challenge progress bars", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("1/3")).toBeInTheDocument(); // Vinnende streak
    expect(screen.getByText("0/1")).toBeInTheDocument(); // Utforsk strategi
    expect(screen.getByText("1/1")).toBeInTheDocument(); // Daglig login
  });

  it("renders stats row with points, rank, and streak", () => {
    const { container } = render(<DailyChallenge />);
    expect(container.textContent).toContain("Dine poeng");
    expect(container.textContent).toContain("#42");
    expect(container.textContent).toContain("Rangering");
    expect(container.textContent).toContain("5");
    expect(container.textContent).toContain("Dagers streak");
    // points.toLocaleString() format varies by locale
    expect(container.textContent).toMatch(/2[,\s]?450/);
  });

  it("renders leaderboard link button", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("Se topplisten")).toBeInTheDocument();
  });

  it("shows reward points for each challenge", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("+500")).toBeInTheDocument();
    expect(screen.getByText("+300")).toBeInTheDocument();
    expect(screen.getByText("+100")).toBeInTheDocument();
  });
});
