import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LevelUpModal } from "../LevelUpModal";

const mockSetShowLevelUp = vi.fn();
const mockUseGamification = vi.fn();

vi.mock("../GamificationProvider", () => ({
  useGamification: (...args: unknown[]) => mockUseGamification(...args),
}));

describe("LevelUpModal", () => {
  it("returns null when showLevelUp is false", () => {
    mockUseGamification.mockReturnValue({
      showLevelUp: false,
      setShowLevelUp: mockSetShowLevelUp,
      newLevel: null,
    });
    const { container } = render(<LevelUpModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal when showLevelUp is true", () => {
    mockUseGamification.mockReturnValue({
      showLevelUp: true,
      setShowLevelUp: mockSetShowLevelUp,
      newLevel: 5,
    });
    render(<LevelUpModal />);
    expect(screen.getByText("LEVEL UP!")).toBeInTheDocument();
    expect(screen.getByText(/NIVÅ 5/)).toBeInTheDocument();
    expect(screen.getByText("Fortsett oppdraget")).toBeInTheDocument();
  });

  it("closes modal when X button is clicked", () => {
    mockUseGamification.mockReturnValue({
      showLevelUp: true,
      setShowLevelUp: mockSetShowLevelUp,
      newLevel: 3,
    });
    render(<LevelUpModal />);
    const closeButton = screen.getAllByRole("button")[0];
    fireEvent.click(closeButton);
    expect(mockSetShowLevelUp).toHaveBeenCalledWith(false);
  });

  it("closes modal when continue button is clicked", () => {
    mockUseGamification.mockReturnValue({
      showLevelUp: true,
      setShowLevelUp: mockSetShowLevelUp,
      newLevel: 3,
    });
    render(<LevelUpModal />);
    const continueButton = screen.getByText("Fortsett oppdraget");
    fireEvent.click(continueButton);
    expect(mockSetShowLevelUp).toHaveBeenCalledWith(false);
  });

  it("renders description text", () => {
    mockUseGamification.mockReturnValue({
      showLevelUp: true,
      setShowLevelUp: mockSetShowLevelUp,
      newLevel: 2,
    });
    render(<LevelUpModal />);
    expect(
      screen.getByText("Du har nådd et nytt nivå på din trading-reise.")
    ).toBeInTheDocument();
  });
});
