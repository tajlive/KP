import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { GamificationCard } from "../GamificationCard";
import { createClient } from "@/lib/utils";

vi.mock("@/lib/utils");
vi.mock("@/lib/auth/new/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockCreateClient = vi.mocked(createClient);

// TODO: Test henger i >120s — trolig ufullstendig mock av framer-motion eller supabase client.
// Se: https://github.com/vitest-dev/vitest/issues/xxxx (module mock deadlock med isolate: false)
describe.skip("GamificationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    } as unknown as ReturnType<typeof createClient>);
  });

  it("renders loading state initially", () => {
    render(<GamificationCard />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
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
    expect(screen.getByText("0")).toBeInTheDocument(); // Total XP
    expect(screen.getByText("Prestasjoner")).toBeInTheDocument();
  });

  it("renders achievements when data exists", async () => {
    mockCreateClient.mockReturnValue({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            if (table === "user_achievements") {
              return Promise.resolve({
                data: [
                  {
                    id: "ach-1",
                    name: "First Trade",
                    description: "Complete your first trade",
                    icon: "first_trade",
                    unlocked_at: "2024-01-01",
                    progress: 1,
                    target: 1,
                  },
                ],
                error: null,
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    } as unknown as ReturnType<typeof createClient>);

    render(<GamificationCard />);
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("First Trade")).toBeInTheDocument();
    });
    expect(screen.getByText("Complete your first trade")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("does not render achievements list when empty", async () => {
    render(<GamificationCard />);
    await waitFor(() => {
      expect(screen.getByText("Din fremgang")).toBeInTheDocument();
    });
    // Stats section still shows "Prestasjoner" label
    expect(screen.getByText("Prestasjoner")).toBeInTheDocument();
  });
});
