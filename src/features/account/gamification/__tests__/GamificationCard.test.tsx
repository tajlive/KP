import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { GamificationCard } from "../GamificationCard";

// Mock-deadlock-fiks (KLA-296): fabrikken må lage user INNE i seg selv, slik at
// den kjøres ÉN gang ved modul-registrering. Uten dette returnerer useAuth() et
// NYTT objekt per kall → komponentens useEffect([user]) kjører uendelig → hang.
vi.mock("@/lib/auth/new/AuthContext", () => {
  const user = { id: "user-123" };
  return {
    useAuth: () => ({ user }),
  };
});

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Re-aktivert 2026-08-14 (KLA-296). Tidligere describe.skip siden 2026-06-22:
// testene mocket en utdatert supabase-klient-sti (user_achievements med name/
// description) som komponenten ikke lenger bruker — komponenten henter nå
// achievements via fetch("/api/gamification/achievements") (KLA-auth:
// browser-klienten er alltid anon). Hang-årsaken (verifisert 2026-08-14):
// useAuth-mocken returnerte nytt user-objekt per kall → useEffect([user])-
// loop; fikset i topp-kommentaren. Den døde supabase-mocken er fjernet som
// rydding. Mønsteret her (fetch-mock + framer-motion-stub) er det samme som
// DailyChallenge.test.tsx i samme katalog, som kjører stabilt.
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  // Default: tom achievements-liste — komponenten viser kun default-nivå.
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ achievements: [] }),
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GamificationCard", () => {
  it("renders loading state initially", async () => {
    // Kontrollerbar deferred fetch — loading-state må vises mens fetch er pending
    let resolveFetch!: (value: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<GamificationCard />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    // Fullfør fetch så testen ikke etterlater pending arbeid
    resolveFetch({ ok: true, json: () => Promise.resolve({ achievements: [] }) });
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
  });

  it("renders card with default level when no data", async () => {
    render(<GamificationCard />);
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("Student")).toBeInTheDocument();
  });

  it("renders stats grid with default values", async () => {
    render(<GamificationCard />);
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
    expect(screen.getByText("1")).toBeInTheDocument(); // Level
    // Prestasjoner-count (0) + Total XP (0) — begge default 0
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("Prestasjoner")).toBeInTheDocument();
  });

  it("renders achievements when data exists", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          achievements: [
            {
              achievement_type: "first_trade",
              earned_at: "2024-01-01",
              metadata: { description: "Complete your first trade" },
            },
          ],
        }),
    });

    render(<GamificationCard />);
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("First trade")).toBeInTheDocument();
    });
    expect(screen.getByText("Complete your first trade")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("does not render achievements list when empty", async () => {
    render(<GamificationCard />);
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
    // Stats-seksjonen viser fortsatt "Prestasjoner"-label
    expect(screen.getByText("Prestasjoner")).toBeInTheDocument();
  });
});
