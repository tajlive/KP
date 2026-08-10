import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CockpitHeader } from "../components/CockpitHeader";
import type { CockpitRiskStatus } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "no",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({ prices: {}, loading: false, isConnected: false }),
}));

const baseRiskStatus: CockpitRiskStatus = {
  dailyLossLimitReached: false,
  maxDrawdownReached: false,
  crashed: false,
};

function renderCockpitHeader(props: Record<string, unknown> = {}) {
  return render(
    <CockpitHeader
      mode="paper"
      canUseLive
      onModeChange={vi.fn()}
      riskStatus={baseRiskStatus}
      {...props}
    />,
  );
}

describe("CockpitHeader", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);
  });

  it("renders header in paper mode with paper button active", () => {
    renderCockpitHeader();
    expect(screen.getByTestId("cockpit-header")).toBeInTheDocument();
    expect(screen.getByTestId("mode-paper-button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("mode-live-button")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("does not use window.alert when interacting with the dialog", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const onModeChange = vi.fn();
    renderCockpitHeader({ onModeChange });

    fireEvent.click(screen.getByTestId("mode-live-button"));
    fireEvent.click(screen.getByTestId("live-mode-cancel"));
    expect(alertSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("mode-live-button"));
    fireEvent.click(screen.getByTestId("live-mode-confirm"));
    await waitFor(() => expect(onModeChange).toHaveBeenCalledWith("live"));
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("opens live-mode confirmation dialog when clicking live button", () => {
    renderCockpitHeader();
    fireEvent.click(screen.getByTestId("mode-live-button"));
    expect(screen.getByTestId("live-mode-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("live-mode-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("live-mode-cancel")).toBeInTheDocument();
    expect(screen.getByTestId("remember-default-checkbox")).toBeInTheDocument();
  });

  it("switches to live and POSTs rememberDefault when confirmed", async () => {
    const onModeChange = vi.fn();
    renderCockpitHeader({ onModeChange });

    fireEvent.click(screen.getByTestId("mode-live-button"));
    expect(screen.getByTestId("live-mode-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("remember-default-checkbox"));
    fireEvent.click(screen.getByTestId("live-mode-confirm"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trading/mode",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ mode: "live", rememberDefault: false }),
        }),
      );
      expect(onModeChange).toHaveBeenCalledWith("live");
    });
  });

  it("cancels live-mode switch and does not call onModeChange or fetch", () => {
    const onModeChange = vi.fn();
    renderCockpitHeader({ onModeChange });

    fireEvent.click(screen.getByTestId("mode-live-button"));
    fireEvent.click(screen.getByTestId("live-mode-cancel"));

    expect(screen.queryByTestId("live-mode-dialog")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("switches directly to paper without confirmation", () => {
    const onModeChange = vi.fn();
    renderCockpitHeader({ mode: "live", onModeChange });

    fireEvent.click(screen.getByTestId("mode-paper-button"));
    expect(screen.queryByTestId("live-mode-dialog")).not.toBeInTheDocument();
    expect(onModeChange).toHaveBeenCalledWith("paper");
  });

  it("disables live button when user cannot use live", () => {
    renderCockpitHeader({ canUseLive: false });
    expect(screen.getByTestId("mode-live-button")).toBeDisabled();
    expect(screen.getByTestId("mode-paper-button")).toBeEnabled();
  });

  it("shows risk banner when crashed sessions exist", () => {
    renderCockpitHeader({
      riskStatus: { ...baseRiskStatus, crashed: true },
    });
    expect(screen.getByTestId("risk-banner")).toBeInTheDocument();
    expect(screen.getByText("cockpit.riskBanner.crashed")).toBeInTheDocument();
  });

  it("shows risk banner when daily loss limit reached", () => {
    renderCockpitHeader({
      riskStatus: { ...baseRiskStatus, dailyLossLimitReached: true },
    });
    expect(screen.getByTestId("risk-banner")).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.riskBanner.dailyLossLimit"),
    ).toBeInTheDocument();
  });

  it("shows risk banner when max drawdown reached", () => {
    renderCockpitHeader({
      riskStatus: { ...baseRiskStatus, maxDrawdownReached: true },
    });
    expect(screen.getByTestId("risk-banner")).toBeInTheDocument();
    expect(
      screen.getByText("cockpit.riskBanner.maxDrawdown"),
    ).toBeInTheDocument();
  });

  it("does not show risk banner when no risk flags", () => {
    renderCockpitHeader();
    expect(screen.queryByTestId("risk-banner")).not.toBeInTheDocument();
  });
});
