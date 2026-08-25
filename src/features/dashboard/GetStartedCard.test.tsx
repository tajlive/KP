/**
 * Tester for GetStartedCard - KLA-73 Testplan
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GetStartedCard, { shouldShowGetStartedCard } from "./GetStartedCard";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "no" }),
}));

// Mock Supabase - return dismissed: false by default (component uses .maybeSingle())
vi.mock("@/lib/utils", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { dismissed_get_started_card: false } }),
          maybeSingle: () =>
            Promise.resolve({ data: { dismissed_get_started_card: false } }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({}),
      }),
    }),
  }),
  cn: (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" "),
}));

// Mock fetch for /api/user/profile calls in component
function mockProfileFetch(dismissed: boolean = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/user/profile")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              profile: { dismissed_get_started_card: dismissed },
            }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as unknown as Response);
    }),
  );
}

describe("GetStartedCard", () => {
  describe("shouldShowGetStartedCard", () => {
    it("should return true when user has no completed lessons and hasn't dismissed", () => {
      expect(shouldShowGetStartedCard([], false)).toBe(true);
    });

    it("should return false when user has dismissed the card", () => {
      expect(shouldShowGetStartedCard([], true)).toBe(false);
    });

    it("should return false when user has completed 3 or more lessons", () => {
      expect(
        shouldShowGetStartedCard(["lesson1", "lesson2", "lesson3"], false),
      ).toBe(false);
    });

    it("should return true when user has completed fewer than 3 lessons", () => {
      expect(shouldShowGetStartedCard(["lesson1", "lesson2"], false)).toBe(
        true,
      );
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
      onboardingCompleted: true,
      totalTrades: 0,
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockProfileFetch(false);
    });

    it("renders all three get started items", async () => {
      render(<GetStartedCard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Kom i gang")).toBeInTheDocument();
      });

      // "Lær mer"-seksjon med de 3 leksjonene
      await waitFor(() => {
        expect(
          screen.getByText("Hva er automatisk trading?"),
        ).toBeInTheDocument();
      });
      expect(screen.getByText("Forstå DCA-strategien")).toBeInTheDocument();
      expect(
        screen.getByText("Slik leser du dashboard-tallene"),
      ).toBeInTheDocument();
    });

    it("shows completed items with strikethrough", async () => {
      render(
        <GetStartedCard
          {...defaultProps}
          completedLessons={["auto-trading-intro"]}
        />,
      );

      await waitFor(() => {
        const completedItem = screen.getByText("Hva er automatisk trading?");
        expect(completedItem).toHaveClass("line-through");
      });
    });

    it("shows progress indicator", async () => {
      // onboardingCompleted=true, totalTrades=0 → "Opprett konto" + "Fullfør onboarding" = 2/5
      render(<GetStartedCard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("2/5 fullført")).toBeInTheDocument();
      });
    });

    it("calls onDismiss when dismiss button is clicked", async () => {
      const onDismiss = vi.fn();
      render(<GetStartedCard {...defaultProps} onDismiss={onDismiss} />);

      await waitFor(() => {
        expect(screen.getByLabelText("Lukk")).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText("Lukk");
      fireEvent.click(dismissButton);

      // Vent på at async dismiss handler fullføres
      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalled();
      });
    });

    it("renders CTA buttons", async () => {
      render(<GetStartedCard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Jeg tar det senere")).toBeInTheDocument();
      });
    });
  });
});
