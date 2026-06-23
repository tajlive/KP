import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PullToRefreshIndicator } from "../PullToRefreshIndicator";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      pull: "Pull down to refresh",
      release: "Release to refresh",
      refreshing: "Refreshing...",
    };
    return map[key] ?? key;
  },
}));

describe("PullToRefreshIndicator", () => {
  it("shows pull hint when pulling but not ready", () => {
    render(<PullToRefreshIndicator distance={30} ready={false} refreshing={false} />);
    expect(screen.getByText(/Pull down to refresh/i)).toBeInTheDocument();
  });

  it("shows release hint when ready", () => {
    render(<PullToRefreshIndicator distance={90} ready refreshing={false} />);
    expect(screen.getByText(/Release to refresh/i)).toBeInTheDocument();
  });

  it("shows spinner when refreshing", () => {
    render(<PullToRefreshIndicator distance={80} ready={false} refreshing />);
    expect(screen.getByText(/Refreshing/i)).toBeInTheDocument();
  });
});
