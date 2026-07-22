import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserDashboardMetrics: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mocks.getUser,
      },
    }),
  ),
}));

vi.mock("@/server/dashboard/getUserDashboardMetrics", () => ({
  getUserDashboardMetrics: mocks.getUserDashboardMetrics,
  DashboardMetricsError: class DashboardMetricsError extends Error {
    constructor(
      message: string,
      public readonly code: string,
    ) {
      super(message);
      this.name = "DashboardMetricsError";
    }
  },
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimitMiddleware: vi.fn(() => null),
}));

vi.mock("@/lib/cache", () => ({
  withCache: vi.fn(async (_key: string, fetchFn: () => Promise<unknown>) => fetchFn()),
  CACHE_TTL: {
    MARKET_DATA: 10 * 1000,
  },
  cacheKeys: {
    portfolio: (userId: string) => `portfolio:${userId}`,
  },
}));

vi.mock("@/lib/sentry", () => ({
  __esModule: true,
  default: {
    captureMessage: vi.fn(),
    captureException: vi.fn(),
  },
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

import { GET } from "../metrics/route";

function createRequest(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

function mockAuthenticated(userId = "user-1") {
  mocks.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

describe("GET /api/dashboard/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserDashboardMetrics.mockResolvedValue({
      totalPnl: 1300,
      totalTrades: 4,
      winRate: 0.67,
      totalCapital: 105000,
      startingCapital: 100000,
      winningTrades: 2,
      losingTrades: 1,
      sessionCount: 1,
      recentSessions: [],
    });
  });

  it("returns 400 when userId is missing", async () => {
    const res = await GET(createRequest("http://localhost/api/dashboard/metrics?mode=paper"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("MISSING_USER_ID");
  });

  it("returns 401 when user is not authenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(
      createRequest("http://localhost/api/dashboard/metrics?userId=u1&mode=paper"),
    );
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when query userId differs from authenticated user", async () => {
    mockAuthenticated("authenticated-user-1");
    const res = await GET(
      createRequest("http://localhost/api/dashboard/metrics?userId=other-user-2&mode=paper"),
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 200 with metrics when userId matches authenticated user", async () => {
    mockAuthenticated("user-1");
    const res = await GET(
      createRequest("http://localhost/api/dashboard/metrics?userId=user-1&mode=paper"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.totalCapital).toBe(105000);
  });

  it("returns 200 with live mode metrics when userId matches", async () => {
    mockAuthenticated("user-1");
    const res = await GET(
      createRequest("http://localhost/api/dashboard/metrics?userId=user-1&mode=live"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.getUserDashboardMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "live", userId: "user-1" }),
    );
  });
});
