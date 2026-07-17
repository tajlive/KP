import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavAuthState } from "../NavAuthState";
import type { NavigationData } from "@/lib/navigation/config";

// Hoisted mocks
const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock("@/lib/auth/new/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/no",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      login: "Logg inn",
      signup: "Registrer deg",
      logout: "Logg ut",
      myPage: "Min side",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@/i18n/href-with-locale", () => ({
  hrefWithLocale: (locale: string, path: string) =>
    path === "/" ? `/${locale}` : `/${locale}${path}`,
}));

const mockNavData: NavigationData = {
  loggedOutLinks: [
    { label: "Lær", path: "/kurs", order: 0 },
    { label: "Priser", path: "/priser", order: 1 },
  ],
  loggedInLinks: [
    { label: "Dashboard", path: "/dashboard", order: 0 },
  ],
};

describe("NavAuthState", () => {
  it("renders 'Logg inn' even when auth is loading (guest)", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true, signOut: vi.fn() });

    render(<NavAuthState navData={mockNavData} />);

    // 'Logg inn' skal vises selv når loading=true og user=null
    expect(screen.getByText("Logg inn")).toBeInTheDocument();
    // 'Registrer deg' skal også vises
    expect(screen.getByText("Registrer deg")).toBeInTheDocument();
    // '...' skal IKKE vises (ingen loading-gating)
    expect(screen.queryByText("...")).not.toBeInTheDocument();
  });

  it("renders dashboard and logout for logged-in users", () => {
    useAuthMock.mockReturnValue({ user: { id: "123" }, loading: false, signOut: vi.fn() });

    render(<NavAuthState navData={mockNavData} />);

    // Innlogget bruker skal se Min side og Logg ut
    expect(screen.getByText("Min side")).toBeInTheDocument();
    expect(screen.getByText("Logg ut")).toBeInTheDocument();
    // Gjesteknapper skal ikke vises
    expect(screen.queryByText("Logg inn")).not.toBeInTheDocument();
  });
});
