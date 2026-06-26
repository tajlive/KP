import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedNumber } from "../AnimatedNumber";

describe("AnimatedNumber", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders formatted number", () => {
    render(<AnimatedNumber value={1234.5} prefix="$" decimals={2} />);
    expect(screen.getByText(/\$1\s234,50/)).toBeInTheDocument();
  });

  it("renders immediately when reduced motion is preferred", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<AnimatedNumber value={9876.54} prefix="€" decimals={2} />);
    expect(screen.getByText(/€9\s876,54/)).toBeInTheDocument();
  });

  it("defaults aria-live to polite", () => {
    render(<AnimatedNumber value={100} />);
    expect(screen.getByText(/100,00/)).toHaveAttribute("aria-live", "polite");
  });

  it("supports overriding aria-live", () => {
    render(<AnimatedNumber value={100} ariaLive="assertive" />);
    expect(screen.getByText(/100,00/)).toHaveAttribute(
      "aria-live",
      "assertive",
    );
  });
});
