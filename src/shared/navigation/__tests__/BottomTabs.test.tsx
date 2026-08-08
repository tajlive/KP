import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomTabs } from "../BottomTabs";

const { usePathnameMock, pushMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn().mockReturnValue("/no/dashboard/portfolio"),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next-intl", () => ({
  useLocale: vi.fn().mockReturnValue("no"),
  useTranslations: () => (key: string) => key,
}));

describe("BottomTabs", () => {
  beforeEach(() => {
    pushMock.mockClear();
    usePathnameMock.mockReturnValue("/no/dashboard/portfolio");
  });

  it("marks portfolio tab as active from pathname", () => {
    render(<BottomTabs />);
    const portfolio = screen.getByTestId("bottom-tab-portfolio");
    expect(portfolio).toHaveAttribute("aria-current", "page");
  });

  it("marks home tab as active on /dashboard (ikke på under-sider)", () => {
    usePathnameMock.mockReturnValue("/no/dashboard");
    render(<BottomTabs />);
    expect(screen.getByTestId("bottom-tab-home")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("bottom-tab-portfolio")).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renderer alle fire faner: home, portfolio, trade, history", () => {
    render(<BottomTabs />);
    expect(screen.getByTestId("bottom-tab-home")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-tab-portfolio")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-tab-trade")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-tab-history")).toBeInTheDocument();
  });

  it("navigates on tab press", () => {
    render(<BottomTabs />);
    fireEvent.click(screen.getByTestId("bottom-tab-trade"));
    expect(pushMock).toHaveBeenCalledWith("/no/handel");
  });
});
