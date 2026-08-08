/**
 * TopNav — guest-header skal aldri vises til innlogget bruker (Task 2).
 *
 * Kontrakt: mens AuthContext LOADER (user=null, loading=true) skal TopNav
 * vise app-headeren (eller i det minste ALDRI «Logg inn / Start gratis»).
 * (user)-gruppen er server-beskyttet av requireAuth — guest-grenen er kun
 * for faktisk utloggede (auth resolved, user=null, loading=false).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock auth — kontrollerbar per test
const mockAuth = vi.fn<() => { user: null | { id: string }; loading: boolean }>();
vi.mock("@/lib/auth/new/AuthContext", () => ({
  useAuth: () => mockAuth(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => key,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/no/dashboard",
}));
vi.mock("../use-active-trader-sessions", () => ({
  useActiveTraderSessions: () => [],
}));
vi.mock("../UserMenu", () => ({
  UserMenu: () => <div data-testid="user-menu">kontomeny</div>,
}));

import { TopNav } from "../TopNav";

describe("TopNav — aldri guest-header inne i appen", () => {
  it("auth LOADER (user=null, loading=true) → viser IKKE «Logg inn»/«Start gratis»", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(<TopNav />);
    expect(screen.queryByText("Logg inn")).toBeNull();
    expect(screen.queryByText("Start gratis")).toBeNull();
    expect(screen.getByText("Klarpakke")).toBeTruthy();
  });

  it("auth resolved, faktisk utlogget → guest-header med login-CTA (korrekt)", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<TopNav />);
    expect(screen.getByText("Logg inn")).toBeTruthy();
    expect(screen.getByText("Start gratis")).toBeTruthy();
  });

  it("innlogget → app-header med kontomeny, aldri guest-CTA", () => {
    mockAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    render(<TopNav />);
    expect(screen.queryByText("Logg inn")).toBeNull();
    expect(screen.queryByText("Start gratis")).toBeNull();
    expect(screen.getByTestId("user-menu")).toBeTruthy();
  });
});
