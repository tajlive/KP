import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { TradingModeSelector } from "../components/TradingModeSelector";

// Norwegian messages for testing
const messages = {
  trading: {
    tradingModeSelector: {
      title: "Velg handelsmodus",
      paper: {
        title: "Øv med lekepenger",
        description: "Alle handler her er simulert. Du risikerer ingen ekte penger.",
        feature1: "Start med 100 000 kr i lekepenger",
        feature2: "Test strategier risikofritt",
        feature3: "Lær uten å tape penger",
      },
      live: {
        title: "Ekte trading",
        description: "Handler med ekte penger. Les vilkår og risiko før du kobler til børs.",
        warning: "Real risiko: Du kan tape penger",
        feature1: "Trader med ekte midler",
        feature2: "Reell fortjeneste og tap",
        feature3: "Skattepliktig inntekt",
      },
      locked: {
        comingSoon: "Live trading kommer snart. Følg med på oppdateringer!",
        connectExchange: "Koble til en børs for å aktivere live trading.",
      },
      liveWarning: {
        title: "Advarsel: Ekte penger",
        description: "Du trader nå med ekte midler. Alle handler vil påvirke din faktiske saldo.",
      },
    },
  },
};

// Helper to render with i18n provider
const renderWithI18n = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider locale="no" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe("TradingModeSelector", () => {
  const defaultProps = {
    mode: "paper" as const,
    onChange: vi.fn(),
    hasExchangeConnection: false,
    isLiveEnabled: false,
  };

  it("renders paper and live options", () => {
    renderWithI18n(<TradingModeSelector {...defaultProps} />);

    expect(screen.getByText("Øv med lekepenger")).toBeInTheDocument();
    expect(screen.getByText("Ekte trading")).toBeInTheDocument();
  });

  it("shows paper mode as selected when mode is paper", () => {
    renderWithI18n(<TradingModeSelector {...defaultProps} />);

    const paperButton = screen.getByText("Øv med lekepenger").closest("button");
    expect(paperButton).toHaveClass("border-kp-brand");
  });

  it("calls onChange when paper mode is clicked", () => {
    const onChange = vi.fn();
    renderWithI18n(<TradingModeSelector {...defaultProps} onChange={onChange} />);

    const paperButton = screen.getByText("Øv med lekepenger").closest("button");
    fireEvent.click(paperButton!);

    expect(onChange).toHaveBeenCalledWith("paper");
  });

  it("disables live mode when isLiveEnabled is false", () => {
    renderWithI18n(<TradingModeSelector {...defaultProps} />);

    const liveButton = screen.getByText("Ekte trading").closest("button");
    expect(liveButton).toBeDisabled();
    expect(liveButton).toHaveClass("cursor-not-allowed");
  });

  it("shows lock indicator when live mode is disabled", () => {
    renderWithI18n(<TradingModeSelector {...defaultProps} />);

    // Lock icon should be present within the live button area
    const liveButton = screen.getByText("Ekte trading").closest("button");
    expect(liveButton).toContainHTML("svg"); // Lock icon is an SVG
    expect(liveButton).toBeDisabled();
  });

  it("enables live mode when hasExchangeConnection and isLiveEnabled are true", () => {
    renderWithI18n(
      <TradingModeSelector
        {...defaultProps}
        hasExchangeConnection={true}
        isLiveEnabled={true}
      />
    );

    const liveButton = screen.getByText("Ekte trading").closest("button");
    expect(liveButton).not.toBeDisabled();
  });

  it("shows live mode as selected when mode is live", () => {
    renderWithI18n(
      <TradingModeSelector
        {...defaultProps}
        mode="live"
        hasExchangeConnection={true}
        isLiveEnabled={true}
      />
    );

    const liveButton = screen.getByText("Ekte trading").closest("button");
    expect(liveButton).toHaveClass("border-kp-success");
  });

  it("shows warning banner when live mode is selected", () => {
    renderWithI18n(
      <TradingModeSelector
        {...defaultProps}
        mode="live"
        hasExchangeConnection={true}
        isLiveEnabled={true}
      />
    );

    expect(screen.getByText("Advarsel: Ekte penger")).toBeInTheDocument();
    expect(screen.getByText(/Du trader nå med ekte midler/)).toBeInTheDocument();
  });

  it("displays paper mode benefits on hover/selection", () => {
    renderWithI18n(<TradingModeSelector {...defaultProps} />);

    expect(screen.getByText("Start med 100 000 kr i lekepenger")).toBeInTheDocument();
    expect(screen.getByText("Test strategier risikofritt")).toBeInTheDocument();
    expect(screen.getByText("Lær uten å tape penger")).toBeInTheDocument();
  });
});
