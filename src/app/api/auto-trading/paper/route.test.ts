import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockCreateServerClient = vi.fn(() => ({
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}));

const mockCreateClient = vi.fn(() => ({
  from: mockFrom,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
  createClient: () => mockCreateClient(),
}));

function createJsonRequest(payload: unknown): NextRequest {
  return new Request("http://localhost:3000/api/auto-trading/paper", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }) as NextRequest;
}

describe("POST /api/auto-trading/paper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(createJsonRequest({}));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      code: "UNAUTHORIZED",
      error: "Unauthorized",
      next_step: "retry",
    });
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1);
  });

  it("creates a new paper trading session when under tier limit", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const profileQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { tier: "student" },
            error: null,
          }),
        })),
      })),
    };

    const countQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
          })),
        })),
      })),
    };

    const single = vi.fn().mockResolvedValue({
      data: { id: "session-abc" },
      error: null,
    });
    const selectAfterInsert = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: selectAfterInsert }));
    const insertQuery = { insert };

    mockFrom
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(insertQuery);

    const response = await POST(
      createJsonRequest({
        strategy: "trend",
        risk_level: "medium",
        pairs: ["ETHUSDT", "BTCUSDT"],
        starting_capital_nok: 250000,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      code: "PAPER_BOT_STARTED",
      message: "Paper bot started successfully",
      session_id: "session-abc",
      next_step: "open_bot_details",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        mode: "paper",
        strategy_id: "trend",
        strategy_config: {
          risk_level: "medium",
          pairs: ["ETHUSDT", "BTCUSDT"],
        },
        starting_capital_nok: 250000,
        current_capital_nok: 250000,
        trading_pair: "ETHUSDT",
        last_heartbeat: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    );
  });

  it("returns 403 when active paper sessions reach tier maximum", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const profileQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { tier: "student" },
            error: null,
          }),
        })),
      })),
    };

    const countQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ count: 999, error: null }),
          })),
        })),
      })),
    };

    mockFrom.mockReturnValueOnce(profileQuery).mockReturnValueOnce(countQuery);

    const response = await POST(
      createJsonRequest({
        strategy: "dca",
        risk_level: "low",
        pairs: ["BTCUSDT"],
        starting_capital_nok: 100000,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      code: "PAPER_BOT_SESSION_LIMIT",
      max_sessions: 999,
      next_step: "retry",
    });
  });
});
