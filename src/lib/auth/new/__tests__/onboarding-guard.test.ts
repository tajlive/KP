/**
 * KLA-263: Regresjonstester for onboarding-guard i auth-flow.
 * Verifiserer redirect til /onboarding for nye/delvis onboardede brukere.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation redirect
let redirectPath: string | null = null;
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirectPath = path;
    throw new Error("NEXT_REDIRECT");
  },
}));

// Mock next-intl
vi.mock("next-intl/server", () => ({ getLocale: async () => "no" }));

// Mock supabase
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      getUser: mockGetUser,
    },
  }),
}));

import { signInWithEmail } from "../auth-actions";

describe("KLA-263 onboarding guard — signInWithEmail", () => {
  beforeEach(() => {
    redirectPath = null;
    vi.clearAllMocks();
  });

  it("redirecter til /onboarding når onboarding_completed mangler", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { user_metadata: {} } } });
    const formData = new FormData();
    formData.set("email", "test@klarpakke.no");
    formData.set("password", "password123");

    try {
      await signInWithEmail(formData);
    } catch (_) {
      /* redirect throws */
    }
    expect(redirectPath).toBe("/no/onboarding");
  });

  it("redirecter til /onboarding når onboarding_completed = false", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { user_metadata: { onboarding_completed: false } } },
    });
    const formData = new FormData();
    formData.set("email", "test@klarpakke.no");
    formData.set("password", "password123");

    try {
      await signInWithEmail(formData);
    } catch (_) {
      /* redirect throws */
    }
    expect(redirectPath).toBe("/no/onboarding");
  });

  it("redirecter til /dashboard når onboarding_completed = true", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { user_metadata: { onboarding_completed: true } } },
    });
    const formData = new FormData();
    formData.set("email", "done@klarpakke.no");
    formData.set("password", "password123");

    try {
      await signInWithEmail(formData);
    } catch (_) {
      /* redirect throws */
    }
    expect(redirectPath).toBe("/no/dashboard");
  });
});
