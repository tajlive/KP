import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock createServerClient slik at requireAdmin får ingen bruker → 401.
// Dette beviser at rutene IKKE lenger er åpne for uautentiserte kall.
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "no session" },
      }),
    },
  }),
}));

// requireAdmin importerer "server-only" — markér som server-miljø i testen.
vi.mock("server-only", () => ({}));

import { GET as campaignRecentGET } from "@/app/api/admin/campaign/recent/route";
import { GET as campaignStatsGET } from "@/app/api/admin/campaign/stats/route";
import { GET as funnelStatsGET } from "@/app/api/admin/funnel/stats/route";

describe("P0-4: admin-ruter uten auth → 401 (regresjon)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["GET /api/admin/campaign/recent", () => campaignRecentGET(new NextRequest("http://localhost/api/admin/campaign/recent"))],
    ["GET /api/admin/campaign/stats", () => campaignStatsGET()],
    ["GET /api/admin/funnel/stats", () => funnelStatsGET()],
  ])("%s → 401 for uautentisert kall", async (_label, call) => {
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("ingen av rutene returnerer brukerdata uten admin-sesjon", async () => {
    const recent = await campaignRecentGET(new NextRequest("http://localhost/api/admin/campaign/recent"));
    expect(recent.status).toBe(401);

    const stats = await campaignStatsGET();
    expect(stats.status).toBe(401);

    const funnel = await funnelStatsGET();
    expect(funnel.status).toBe(401);
  });
});
