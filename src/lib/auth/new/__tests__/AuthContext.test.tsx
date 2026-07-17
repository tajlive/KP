/**
 * AuthContext-tester — bevis at /user-polling-stormen er eliminert
 *
 * Tester:
 * 1. Kun 1 getUser() (via getSession) ved mount
 * 2. Exponential backoff stopper etter 5 forsøk ved vedvarende feil
 * 3. Failsafe setter loading=false etter 5s
 * 4. Debounce på focus/visibility-refresh (min 30s)
 * 5. document.hidden stopper refresh
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Mock Supabase-klienten ─────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  })),
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  })),
  CONFIG_ERROR_MSG: "Supabase er ikke konfigurert.",
}));

// ─── Test-hjelper: wrapper med AuthProvider ──────────────────────────────

import { AuthProvider, useAuth } from "@/lib/auth/new/AuthContext";

function TestConsumer() {
  const { user, loading, error } = useAuth();
  const calls = React.useRef(0);
  calls.current += 1;

  return (
    <div>
      <div data-testid="loading">{loading ? "true" : "false"}</div>
      <div data-testid="user">{user ? user.email ?? "has-user" : "null"}</div>
      <div data-testid="error">{error ? error.message : "null"}</div>
      <div data-testid="renders">{calls.current}</div>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

// ─── Tester ──────────────────────────────────────────────────────────────

describe("AuthContext — anti-polling safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Standard mock: getSession returnerer session
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    // Default: document er synlig
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
  });

  // ── Test 1: Kun 1 getUser (via getSession) ved mount ─────────────────
  it("skal kalle getSession èn gang ved mount (ingen polling-loop)", async () => {
    renderAuthProvider();

    // Vent på async init
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // getSession skal være kalt nøyaktig 1 gang
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    // onAuthStateChange skal være satt opp 1 gang
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

    // getUser skal IKKE ha blitt kalt (vi bruker getSession i stedet)
    expect(mockGetUser).toHaveBeenCalledTimes(0);

    // loading skal være false
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  // ── Test 2: Failsafe — loading=false etter 5s uansett ────────────────
  it("skal sette loading=false etter 5s failsafe selv om getSession henger", async () => {
    // getSession henger (resolver aldri)
    mockGetSession.mockImplementation(() => new Promise(() => {}));

    renderAuthProvider();

    // loading skal være true umiddelbart
    expect(screen.getByTestId("loading").textContent).toBe("true");

    // Etter 4.5s skal loading fortsatt være true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });
    expect(screen.getByTestId("loading").textContent).toBe("true");

    // Etter 5s failsafe — loading skal være false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  // ── Test 3: Backoff stopper etter 5 forsøk ved vedvarende feil ──────
  it("skal prøve max 5 ganger med backoff og deretter gi opp", async () => {
    // getSession kaster alltid feil
    const networkError = new Error("Network error");
    mockGetSession.mockRejectedValue(networkError);

    renderAuthProvider();

    // Vent på at init kjører og feiler
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Første getSession-kall ved mount
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    // Vent gjennom alle backoff-forsøk:
    // Forsøk 1: mount (umiddelbar)
    // Backoff 1: 2s → forsøk 2
    // Backoff 2: 4s → forsøk 3
    // Backoff 3: 8s → forsøk 4
    // Backoff 4: 16s → forsøk 5
    // Totalt: 2+4+8+16 = 30s for forsøk 2-5
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35000);
    });

    // Skal ha prøvd nøyaktig MAX_BACKOFF_ATTEMPTS (5) ganger
    expect(mockGetSession).toHaveBeenCalledTimes(5);

    // Skal IKKE prøve igjen etter 5 feil
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });

    // Fortsatt 5 — ingen flere forsøk
    expect(mockGetSession).toHaveBeenCalledTimes(5);

    // Error skal være satt
    expect(screen.getByTestId("error").textContent).not.toBe("null");

    // loading skal være false (gir opp)
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  // ── Test 4: Focus/visibility har min 30s debounce ───────────────────
  it("skal ha min 30s debounce på visibilitychange-refresh", async () => {
    // Date.now() kan ikke fakes via vi.useFakeTimers() (vitest begrensing),
    // så vi mock'er Date.now direkte for å kontrollere debounce-timing.
    const origDateNow = Date.now.bind(Date);

    renderAuthProvider();

    // Vent på at init fullfører
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    // Første visibilitychange: lastFocusRefreshRef er 0, så debounce
    // passerer og refresh trigges — dette setter også ref til Date.now()
    Date.now = vi.fn(() => 100_000);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(mockGetSession).toHaveBeenCalledTimes(2);

    // Andre visibilitychange rett etter: debounce skal stoppe (30s har ikke gått)
    Date.now = vi.fn(() => 100_100); // bare 100ms senere
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(100);
    });
    // Fortsatt 2 — debounce blokkerte
    expect(mockGetSession).toHaveBeenCalledTimes(2);

    // Tredje visibilitychange etter 31s: debounce har passert, refresh trigges
    Date.now = vi.fn(() => 131_100); // 31s+100ms siden forrige
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(100);
    });
    // Nå 3 — debounce passerte
    expect(mockGetSession).toHaveBeenCalledTimes(3);

    Date.now = origDateNow;
  });
  // ── Test 5: document.hidden stopper refresh ──────────────────────────
  it("skal ikke refreshe når document er hidden", async () => {
    renderAuthProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    // Gjør document hidden
    await act(async () => {
      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
      });
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Vent 35s og prøv focus (som dispatcher refresh)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35000);
      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(100);
    });

    // Fortsatt bare 1 kall (document hidden)
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  // ── Test 6: refreshUser() er rate-limited ────────────────────────────
  it("skal rate-limite refreshUser() til max 1 kall per 10s", async () => {
    // For denne testen trenger vi getUser mock
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    function RefreshTestConsumer() {
      const { refreshUser } = useAuth();
      return (
        <button data-testid="refresh-btn" onClick={() => refreshUser()}>
          Refresh
        </button>
      );
    }

    render(
      <AuthProvider>
        <RefreshTestConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // getUser skal ikke ha blitt kalt under init (vi bruker getSession)
    expect(mockGetUser).toHaveBeenCalledTimes(0);

    // Klikk refresh 3 ganger raskt
    const btn = screen.getByTestId("refresh-btn");
    await act(async () => {
      btn.click();
      btn.click();
      btn.click();
      await vi.advanceTimersByTimeAsync(100);
    });

    // Bare 1 getUser-kall (rate-limited)
    expect(mockGetUser).toHaveBeenCalledTimes(1);

    // Vent 11s og klikk igjen
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
      btn.click();
      await vi.advanceTimersByTimeAsync(100);
    });

    // Nå skal det være 2 getUser-kall
    // (1 fra første batch, 1 fra andre klikk)
    expect(mockGetUser).toHaveBeenCalledTimes(2);
  });
});
