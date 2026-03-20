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
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockCreateServerClient).toHaveBeenCalledTimes(1);
  });

  it("creates a paper trading session for authenticated users", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const existingQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle,
              })),
            })),
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
      .mockReturnValueOnce(existingQuery)
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
    expect(body).toEqual({ success: true, session_id: "session-abc" });
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
      }),
    );
  });
});
