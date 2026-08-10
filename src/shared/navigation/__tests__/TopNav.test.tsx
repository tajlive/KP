/**
 * TopNav — guest-header skal aldri vises til innlogget bruker (Task 2).
 *
 * Kontrakt: mens AuthContext LOADER (user=null, loading=true) skal TopNav
 * vise app-headeren (eller i det minste ALDRI «Logg inn / Start gratis»).
 * (user)-gruppen er server-beskyttet av requireAuth — guest-grenen er kun
 * for faktisk utloggede (auth resolved, user=null, loading=false).
 *
 * 2026-08-10: TopNav bruker useServerVerifiedUser — klientkontekst null
 * er ikke nok bevis i prod (HttpOnly-cookie-sesjon). Komponenten venter på
 * /api/auth/me før guest-header vises, derfor er testene asynkrone.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock auth — kontrollerbar per test
const mockAuth =
  vi.fn<() => { user: null | { id: string }; loading: boolean }>();
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

const realFetch = global.fetch;

function mockServerAuth(authenticated: boolean) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: authenticated,
    status: authenticated ? 200 : 401,
    json: () =>
      Promise.resolve(
        authenticated ? { user: { id: "u9", email: "x@y.no" } } : {},
      ),
  } as Response);
}

describe("TopNav — aldri guest-header inne i appen", () => {
  beforeEach(() => {
    mockServerAuth(false); // default: server svarer 401
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("auth LOADER (user=null, loading=true) → viser IKKE «Logg inn»/«Start gratis»", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(<TopNav />);
    expect(screen.queryByText("Logg inn")).toBeNull();
    expect(screen.queryByText("Start gratis")).toBeNull();
    expect(screen.getByText("Klarpakke")).toBeTruthy();
  });

  it("auth resolved + server 401, faktisk utlogget → guest-header med login-CTA (korrekt)", async () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<TopNav />);
    expect(await screen.findByText("Logg inn")).toBeTruthy();
    expect(screen.getByText("Start gratis")).toBeTruthy();
  });

  it("kontekst null men server verifiserer bruker → app-header, aldri guest-CTA (prod-scenariet 2026-08-10)", async () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    mockServerAuth(true);
    render(<TopNav />);
    expect(screen.queryByText("Logg inn")).toBeNull();
    expect(await screen.findByTestId("user-menu")).toBeTruthy();
  });

  it("innlogget via kontekst → app-header med kontomeny, aldri guest-CTA", () => {
    mockAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    render(<TopNav />);
    expect(screen.queryByText("Logg inn")).toBeNull();
    expect(screen.queryByText("Start gratis")).toBeNull();
    expect(screen.getByTestId("user-menu")).toBeTruthy();
  });
});
