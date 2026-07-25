import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyAdminAccess = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/verify-admin-access", () => ({
  verifyAdminAccess,
}));

import { POST as cronTriggerPOST } from "@/app/api/admin/cron-trigger/route";
import { GET as dashboardDataGET } from "@/app/api/admin/dashboard/data/route";
import { GET as githubHealthGET } from "@/app/api/admin/github-health/route";
import { GET as resendHealthGET } from "@/app/api/admin/resend-health/route";
import {
  GET as sessionsGET,
  POST as sessionsPOST,
} from "@/app/api/admin/sessions/route";
import { GET as statsGET } from "@/app/api/admin/stats/route";
import { GET as stripeHealthGET } from "@/app/api/admin/stripe-health/route";
import { POST as userPaperBalancePOST } from "@/app/api/admin/user-paper-balance/route";
import { POST as userTierPOST } from "@/app/api/admin/user-tier/route";
import {
  GET as usersGET,
  POST as usersPOST,
} from "@/app/api/admin/users/route";
import { POST as usersSyncPOST } from "@/app/api/admin/users/sync/route";
import { GET as verifyGET } from "@/app/api/admin/verify/route";
import { POST as cockpitReportPOST } from "@/app/api/admin/support/cockpit-report/route";
import { GET as cockpitReportStatusGET } from "@/app/api/admin/support/cockpit-report/status/route";

describe("admin API routes — avviser uten gyldig admin (verifyAdminAccess)", () => {
  beforeEach(() => {
    verifyAdminAccess.mockResolvedValue({
      ok: false,
      error: "Unauthorized",
      status: 401,
    });
  });

  afterEach(() => {
    verifyAdminAccess.mockReset();
  });

  it.each([
    ["GET /api/admin/stats", () => statsGET()],
    [
      "GET /api/admin/users",
      () => usersGET(new NextRequest("http://localhost/api/admin/users")),
    ],
    ["GET /api/admin/sessions", () => sessionsGET()],
    [
      "POST /api/admin/sessions",
      () =>
        sessionsPOST(
          new NextRequest("http://localhost/api/admin/sessions", {
            method: "POST",
            body: JSON.stringify({ sessionId: "x", action: "stop" }),
          }),
        ),
    ],
    [
      "GET /api/admin/github-health",
      () => githubHealthGET(new NextRequest("http://localhost")),
    ],
    [
      "GET /api/admin/stripe-health",
      () => stripeHealthGET(new NextRequest("http://localhost")),
    ],
    [
      "GET /api/admin/resend-health",
      () => resendHealthGET(new NextRequest("http://localhost")),
    ],
    [
      "POST /api/admin/cron-trigger",
      () =>
        cronTriggerPOST(
          new NextRequest("http://localhost", { method: "POST", body: "{}" }),
        ),
    ],
    [
      "POST /api/admin/user-tier",
      () =>
        userTierPOST(
          new NextRequest("http://localhost", {
            method: "POST",
            body: JSON.stringify({
              user_id: "00000000-0000-4000-8000-000000000001",
              tier: "student",
            }),
          }),
        ),
    ],
    [
      "POST /api/admin/user-paper-balance",
      () =>
        userPaperBalancePOST(
          new NextRequest("http://localhost", {
            method: "POST",
            body: JSON.stringify({
              user_id: "00000000-0000-4000-8000-000000000001",
              balance_nok: 1000,
            }),
          }),
        ),
    ],
    [
      "POST /api/admin/users",
      () =>
        usersPOST(
          new NextRequest("http://localhost", {
            method: "POST",
            body: JSON.stringify({
              email: "x@y.z",
              password: "TestPassword123!",
            }),
          }),
        ),
    ],
    [
      "POST /api/admin/users/sync",
      () =>
        usersSyncPOST(new NextRequest("http://localhost", { method: "POST" })),
    ],
    [
      "POST /api/admin/support/cockpit-report",
      () =>
        cockpitReportPOST(
          new NextRequest("http://localhost", {
            method: "POST",
            body: JSON.stringify({
              user_id: "00000000-0000-4000-8000-000000000001",
            }),
          }),
        ),
    ],
    [
      "GET /api/admin/support/cockpit-report/status",
      () =>
        cockpitReportStatusGET(
          new NextRequest(
            "http://localhost/api/admin/support/cockpit-report/status?jobId=00000000-0000-4000-8000-000000000001",
          ),
        ),
    ],
  ])("%s → 401", async (_label, call) => {
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/verify uten Authorization → 401 (når Supabase er satt)", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "vitest-anon-key";
    try {
      const res = await verifyGET(
        new Request("http://localhost/api/admin/verify"),
      );
      expect(res.status).toBe(401);
    } finally {
      if (prevUrl !== undefined) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      } else {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      }
      if (prevKey !== undefined) {
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey;
      } else {
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
    }
  });
});

describe("admin API routes — 403 når verifyAdminAccess sier forbidden", () => {
  beforeEach(() => {
    verifyAdminAccess.mockResolvedValue({
      ok: false,
      error: "Forbidden: Admin access required",
      status: 403,
    });
  });

  afterEach(() => {
    verifyAdminAccess.mockReset();
  });

  it("GET /api/admin/stats → 403", async () => {
    const res = await statsGET();
    expect(res.status).toBe(403);
  });
});

describe("admin API uten verifyAdminAccess — dashboard/data (service role)", () => {
  it("GET /api/admin/dashboard/data uten Supabase-url → 503", async () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      const res = await dashboardDataGET(
        new NextRequest("http://localhost/api/admin/dashboard/data?period=7d"),
      );
      expect(res.status).toBe(503);
    } finally {
      if (prevUrl !== undefined) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl;
      }
    }
  });
});
