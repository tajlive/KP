/**
 * Tester for GetStartedCard - KLA-73 Testplan
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GetStartedCard, { shouldShowGetStartedCard } from "./GetStartedCard";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "no" }),
}));

// Mock Supabase
vi.mock("@/lib/utils", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({}),
      }),
    }),
  }),
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" "),
}));

describe("GetStartedCard", () => {
  describe("shouldShowGetStartedCard", () => {
    it("should return true when user has no completed lessons and hasn't dismissed", () => {
      expect(shouldShowGetStartedCard([], false)).toBe(true);
    });

    it("should return false when user has dismissed the card", () => {
      expect(shouldShowGetStartedCard([], true)).toBe(false);
    });

    it("should return false when user has completed 3 or more lessons", () => {
      expect(shouldShowGetStartedCard(["lesson1", "lesson2", "lesson3"], false)).toBe(false);
    });

    it("should return true when user has completed fewer than 3 lessons", () => {
      expect(shouldShowGetStartedCard(["lesson1", "lesson2"], false)).toBe(true);
    });

    it("should return false when dismissed even with fewer than 3 lessons", () => {
      expect(shouldShowGetStartedCard(["lesson1"], true)).toBe(false);
    });
  });

  describe("GetStartedCard component", () => {
    const defaultProps = {
      userId: "user-123",
      completedLessons: [] as string[],
      onDismiss: vi.fn(),
    };

    it("renders all three get started items", () => {
      render(<GetStartedCard {...defaultProps} />);
      
      expect(screen.getByText("Kom i gang")).toBeInTheDocument();
      expect(screen.getByText("Hva er automatisk trading?")).toBeInTheDocument();
      expect(screen.getByText("Forstå DCA-strategien")).toBeInTheDocument();
      expect(screen.getByText("Slik leser du dashboard-tallene")).toBeInTheDocument();
    });

    it("shows completed items with strikethrough", () => {
      render(<GetStartedCard {...defaultProps} completedLessons={["auto-trading-intro"]} />);
      
      const completedItem = screen.getByText("Hva er automatisk trading?");
      expect(completedItem).toHaveClass("line-through");
    });

    it("shows progress indicator", () => {
      render(<GetStartedCard {...defaultProps} completedLessons={["auto-trading-intro"]} />);
      
      expect(screen.getByText("1/3 fullført")).toBeInTheDocument();
    });

    it("calls onDismiss when dismiss button is clicked", () => {
      const onDismiss = vi.fn();
      render(<GetStartedCard {...defaultProps} onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByLabelText("Lukk");
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalled();
    });

    it("shows correct duration for each item", () => {
      render(<GetStartedCard {...defaultProps} />);
      
      expect(screen.getByText("5 min")).toBeInTheDocument();
      expect(screen.getByText("7 min")).toBeInTheDocument();
    });
  });
});
