/**
 * Tester for DashboardLearningSidebar - KLA-75 Testplan
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import DashboardLearningSidebar, { getCurrentLevel } from "./DashboardLearningSidebar";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "no" }),
}));

// Mock Supabase
vi.mock("@/lib/utils", () => ({
  createClient: () => ({}),
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" "),
}));

const messages = {
  dashboard: {
    learningPath: {
      title: "Læringsløp",
      level: "Nivå",
      lessons: "leksjoner",
      continueWhere: "Fortsett der du slapp",
      yourTracks: "Dine kurs",
      done: "Ferdig",
      yourBadges: "Dine Badges",
      goToAcademy: "Gå til Akademiet",
    },
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("DashboardLearningSidebar", () => {
  describe("getCurrentLevel", () => {
    it("should return 'beginner' for 0% completion", () => {
      expect(getCurrentLevel(0, 10)).toBe("beginner");
    });

    it("should return 'beginner' for less than 33% completion", () => {
      expect(getCurrentLevel(3, 10)).toBe("beginner");
    });

    it("should return 'intermediate' for 33-66% completion", () => {
      expect(getCurrentLevel(5, 10)).toBe("intermediate");
    });

    it("should return 'advanced' for more than 66% completion", () => {
      expect(getCurrentLevel(7, 10)).toBe("advanced");
    });

    it("should return 'advanced' for 100% completion", () => {
      expect(getCurrentLevel(10, 10)).toBe("advanced");
    });

    it("should handle empty total gracefully", () => {
      expect(getCurrentLevel(0, 0)).toBe("beginner");
    });
  });

  describe("DashboardLearningSidebar component", () => {
    const defaultProps = {
      userId: "user-123",
      completedLessonIds: [] as string[],
      earnedBadges: [] as { id: string; trackId: string; label: string; description: string; earnedAt: string; icon: string }[],
      currentTrackId: "grunnkurs-krypto",
    };

    it("renders learning path header", () => {
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} />);
      expect(screen.getByText("Læringsløp")).toBeInTheDocument();
    });

    it("shows correct level based on progress", () => {
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} completedLessonIds={["gk-01", "gk-02", "gk-03"]} />);
      expect(screen.getByText(/Nivå:/)).toBeInTheDocument();
    });

    it("shows progress percentage", () => {
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} completedLessonIds={["gk-01"]} />);
      // Progress percentage should be visible
      expect(document.querySelector('[class*="bg-indigo-500/20"]')).toBeInTheDocument();
    });

    it("shows all learning tracks", () => {
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} />);
      expect(screen.getByText("Grunnkurs i Krypto")).toBeInTheDocument();
      expect(screen.getByText("Risikostyring")).toBeInTheDocument();
      expect(screen.getByText("Teknisk Analyse")).toBeInTheDocument();
    });

    it("shows earned badges section when badges exist", () => {
      const badges = [
        {
          id: "badge-grunnkurs",
          trackId: "grunnkurs-krypto",
          label: "Krypto Nybegynner",
          description: "Du har fullført grunnkurset",
          earnedAt: new Date().toISOString(),
          icon: "BookOpen",
        },
      ];
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} earnedBadges={badges} />);
      expect(screen.getByText("Dine Badges")).toBeInTheDocument();
    });

    it("shows continue learning section when there are incomplete lessons", () => {
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} completedLessonIds={["gk-01"]} />);
      expect(screen.getByText("Fortsett der du slapp")).toBeInTheDocument();
    });

    it("shows completed badge for finished tracks", () => {
      // Mark all lessons in grunnkurs as completed
      const allGrunnkursLessons = [
        "gk-01-intro", "gk-02-risiko", "gk-03-quiz-risiko", "gk-04-simulator-intro",
        "gk-05-kalkulator", "gk-06-first-trade", "gk-07-quiz-fullfor"
      ];
      renderWithIntl(
        <DashboardLearningSidebar
          {...defaultProps}
          completedLessonIds={allGrunnkursLessons}
          currentTrackId="grunnkurs-krypto"
        />
      );
      expect(screen.getByText("Ferdig")).toBeInTheDocument();
    });

    it("shows academy CTA button", () => {
      renderWithIntl(<DashboardLearningSidebar {...defaultProps} />);
      expect(screen.getByText("Gå til Akademiet")).toBeInTheDocument();
    });
  });
});
