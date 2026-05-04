import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DashboardLoadingSkeleton } from "../DashboardLoadingSkeleton";

describe("DashboardLoadingSkeleton", () => {
  it("renders loading skeleton with pulse elements", () => {
    const { container } = render(<DashboardLoadingSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(5); // title + 4 cards
  });

  it("has min-h-screen container", () => {
    const { container } = render(<DashboardLoadingSkeleton />);
    expect(container.querySelector(".min-h-screen")).toBeTruthy();
  });
});
