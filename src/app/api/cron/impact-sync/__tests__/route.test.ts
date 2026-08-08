/**
 * Tester for /api/cron/impact-sync — Impact-affiliate-synkronisering.
 *
 * Verifiserer:
 *  - Kill switch: IMPACT_SYNC_ENABLED != true → 503
 *  - Auth: CRON_SECRET kreves (x-api-key eller Bearer)
 *  - Suksess: henter Actions + Campaigns, lagrer i affiliate_sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Statisk import av route.ts krasjer når NEXT_PUBLIC_SUPABASE_URL mangler
// (module-scope createClient). Importen gjøres derfor dynamisk i beforeEach,
// etter at test-env er satt — robust også uten .env.local i shell.
let POST: typeof import("../route").POST;

async function loadRoute() {
  ({ POST } = await import("../route"));
}

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Request;
}

describe("POST /api/cron/impact-sync", () => {
  const OLD_ENV = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.IMPACT_ACCOUNT_SID = "test-sid";
    process.env.IMPACT_AUTH_TOKEN = "test-token";
    // Module-scope createClient krever Supabase-env ved import
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-key";
    await loadRoute();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    vi.restoreAllMocks();
  });

  it("returnerer 503 når kill switch er av (default)", async () => {
    delete process.env.IMPACT_SYNC_ENABLED;
    const res = await POST(makeRequest({ "x-api-key": "test-cron-secret" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("disabled");
  });

  it("returnerer 401 uten gyldig CRON_SECRET", async () => {
    process.env.IMPACT_SYNC_ENABLED = "true";
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("synkroniserer Actions + Campaigns og lagrer i affiliate_sync", async () => {
    process.env.IMPACT_SYNC_ENABLED = "true";

    // Nullstill modul-cache på nytt: beforeEach sin loadRoute() har allerede
    // importert route-en med EKTE avhengigheter — doMock under må få treffe.
    vi.resetModules();

    const mockActions = vi.fn().mockResolvedValue([
      {
        Id: "act-1",
        ActionType: "Sale",
        Status: "APPROVED",
        Payout: "10.00",
        Currency: "USD",
      },
    ]);
    const mockCampaigns = vi.fn().mockResolvedValue([
      { Id: "camp-1", Name: "OKX", ContractStatus: "Active" },
    ]);
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("@/lib/impact/impact-client", () => ({
      getImpactActions: mockActions,
      getImpactCampaigns: mockCampaigns,
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        from: () => ({ insert: mockInsert }),
      }),
    }));

    const { POST: PostFresh } = await import("../route");
    const res = await PostFresh(
      makeRequest({ "x-api-key": "test-cron-secret" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary.actionCount).toBe(1);
    expect(body.summary.campaignCount).toBe(1);
    expect(body.summary.approvedCount).toBe(1);
    expect(body.summary.totalPayout).toBe(10);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "impact",
        status: "ok",
        summary: expect.objectContaining({ actionCount: 1 }),
      }),
    );
  });
});
