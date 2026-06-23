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

  it("navigates on tab press", () => {
    render(<BottomTabs />);
    fireEvent.click(screen.getByTestId("bottom-tab-trade"));
    expect(pushMock).toHaveBeenCalledWith("/no/handel");
  });
});
