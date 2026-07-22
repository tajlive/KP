import * as React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickActions } from "../components/QuickActions";
import type { CockpitContextValue } from "../hooks/useCockpit";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/no/handel",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "no",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockUseCockpit = vi.fn();

vi.mock("../hooks/useCockpit", () => ({
  useCockpit: () => mockUseCockpit(),
}));

function renderQuickActions(context: Partial<CockpitContextValue> = {}) {
  mockUseCockpit.mockReturnValue({
    mode: "paper",
    statusCounts: { active: 0, paused: 0, stopped: 0, crashed: 0 },
    refresh: mockRefresh,
    ...context,
  });
  return render(<QuickActions />);
}

describe("QuickActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefresh.mockClear();
    mockPush.mockClear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);
  });

  it("renders all action buttons", () => {
    renderQuickActions();
    expect(
      screen.getByText("cockpit.quickActions.startRobot"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.quickActions.pauseAll"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.quickActions.viewHistory"),
    ).toBeInTheDocument();
  });

  it("does not use window.alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderQuickActions();
    const buttons = screen.getAllByRole("button");
    await act(async () => {
      buttons.forEach((button) => fireEvent.click(button));
    });
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("starts a robot session via POST /api/trading/sessions", async () => {
    renderQuickActions({ mode: "paper" });
    fireEvent.click(screen.getByText("cockpit.quickActions.startRobot"));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trading/sessions",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "paper" }),
        }),
      ),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("pauses all active sessions via PATCH /api/trading/sessions", async () => {
    renderQuickActions({
      statusCounts: { active: 2, paused: 0, stopped: 0, crashed: 0 },
    });
    fireEvent.click(screen.getByText("cockpit.quickActions.pauseAll"));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trading/sessions",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ all: true, mode: "paper", action: "pause" }),
        }),
      ),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("resumes all paused sessions via PATCH /api/trading/sessions", async () => {
    renderQuickActions({
      statusCounts: { active: 0, paused: 3, stopped: 0, crashed: 0 },
    });
    fireEvent.click(screen.getByText("cockpit.quickActions.resumeAll"));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trading/sessions",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ all: true, mode: "paper", action: "resume" }),
        }),
      ),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("navigates to dashboard historikk when viewing history", () => {
    renderQuickActions();
    fireEvent.click(screen.getByText("cockpit.quickActions.viewHistory"));
    expect(mockPush).toHaveBeenCalledWith("/no/dashboard/historikk");
  });
});
