import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobilePullToRefreshWrapper } from "../MobilePullToRefreshWrapper";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("MobilePullToRefreshWrapper", () => {
  it("renders children", () => {
    render(
      <MobilePullToRefreshWrapper>
        <div data-testid="child">Portfolio</div>
      </MobilePullToRefreshWrapper>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
