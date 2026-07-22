import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/no/profile",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "title": "Profil",
      "subtitle": "Administrer din konto",
      "tabs.profile": "Profil",
      "tabs.wallet": "Lommebok",
      "tabs.settings": "Innstillinger",
      "tabs.notifications": "Varsler",
      "loading": "Laster...",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@/shared/ui/LoginRequired", () => ({
  LoginRequired: () => <div>LoginRequired</div>,
}));

vi.mock("@/features/account/profile/ProfileTab", () => ({
  ProfileTab: () => <div>ProfileTab</div>,
}));
vi.mock("@/features/account/profile/WalletTab", () => ({
  WalletTab: () => <div>WalletTab</div>,
}));
vi.mock("@/features/account/profile/SettingsTab", () => ({
  SettingsTab: () => <div>SettingsTab</div>,
}));
vi.mock("@/features/account/profile/NotificationsTab", () => ({
  NotificationsTab: () => <div>NotificationsTab</div>,
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { ProfilePageClient } from "../ProfilePageClient";

function profileResponse(status: number) {
  return new Response(
    JSON.stringify(
      status === 200
        ? { ok: true, profile: { id: "u1", display_name: "Test" }, wallets: [] }
        : { ok: false, error: "Ikke innlogget" },
    ),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("ProfilePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows loading state while checking auth", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<ProfilePageClient />);
    expect(screen.getByText("Laster...")).toBeInTheDocument();
  });

  it("shows LoginRequired on 401 from /api/user/profile", async () => {
    mockFetch.mockResolvedValue(profileResponse(401));
    render(<ProfilePageClient />);

    await waitFor(() => {
      expect(screen.getByText("LoginRequired")).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/user/profile", expect.any(Object));
  });

  it("renders profile tabs when authenticated", async () => {
    mockFetch.mockResolvedValue(profileResponse(200));
    render(<ProfilePageClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
      expect(screen.getByText("Innstillinger")).toBeInTheDocument();
      expect(screen.getByText("Lommebok")).toBeInTheDocument();
    });
  });

  it("uses initialTab when provided", async () => {
    mockFetch.mockResolvedValue(profileResponse(200));
    render(<ProfilePageClient initialTab="settings" />);

    await waitFor(() => {
      expect(screen.getByText("SettingsTab")).toBeInTheDocument();
    });
  });
});
