import { afterAll, describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * P0-5 regresjonstest: JWT-claim-eskalering via user_metadata.
 *
 * Sårbarheten: `withRole` leste rolle fra `user.user_metadata?.role` —
 * `user_metadata` er KLIENT-SKRIVBAR via `supabase.auth.updateUser({data:{role:"admin"}})`.
 * En lavprivilegert bruker kunne selv-promotere seg til admin.
 *
 * Fiksen: rolle leses fra DB (`user_profiles.role`) via service-role-klient,
 * aldri fra JWT-metadata. Testen simulerer angriperen: JWT-en HAR admin-claim
 * i user_metadata, men DB sier "user" → forventet 403.
 *
 * NB: vi mockER createClient (ikke api-auth-modulen) slik at den EKTE
 * withRole-implementasjonen kjører med falsk Supabase.
 */

const mockGetUser = vi.hoisted(() => vi.fn());
const mockProfileLookup = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockProfileLookup,
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

import { withRole } from "@/lib/api-auth";

const envBackup = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

describe("P0-5: withRole — ingen eskalering via user_metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = envBackup.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = envBackup.anon;
    process.env.SUPABASE_SERVICE_ROLE_KEY = envBackup.service;
  });

  it("lavprivilegert bruker med user_metadata admin-claim → 403 (DB er sannhet)", async () => {
    // Angriper: JWT bærer admin-rolle i user_metadata (klient-skrivbar)
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "lowpriv-user-1",
          email: "lowpriv@example.com",
          user_metadata: { role: "admin" }, // ← klienten satte dette selv
          app_metadata: {},
        },
      },
      error: null,
    });
    // DB sannhet: rollen er "user"
    mockProfileLookup.mockResolvedValue({
      data: { role: "user" },
      error: null,
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const protectedRoute = withRole(["admin"], handler);

    const req = new NextRequest(
      "http://localhost/api/admin/trader-verifications",
      {
        method: "POST",
        headers: { Authorization: "Bearer forged-jwt-with-admin-claim" },
      },
    );

    const res = await protectedRoute(req);
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("bruker uten profilrad i DB → 403 (fail-closed)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "ghost-user",
          email: "ghost@example.com",
          user_metadata: { role: "admin" },
          app_metadata: {},
        },
      },
      error: null,
    });
    mockProfileLookup.mockResolvedValue({ data: null, error: null });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const protectedRoute = withRole(["admin"], handler);

    const req = new NextRequest("http://localhost/api/admin/x", {
      headers: { Authorization: "Bearer x" },
    });

    const res = await protectedRoute(req);
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("DB-feil → 403 (fail-closed, aldri åpen)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "u1", email: "u1@example.com", user_metadata: {} },
      },
      error: null,
    });
    mockProfileLookup.mockRejectedValue(new Error("db down"));

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const protectedRoute = withRole(["admin"], handler);

    const req = new NextRequest("http://localhost/api/admin/x", {
      headers: { Authorization: "Bearer x" },
    });

    const res = await protectedRoute(req);
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("ekte admin (DB-rolle=admin) → handler kalles", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "admin-1", email: "admin@example.com", user_metadata: {} },
      },
      error: null,
    });
    mockProfileLookup.mockResolvedValue({
      data: { role: "admin" },
      error: null,
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const protectedRoute = withRole(["admin"], handler);

    const req = new NextRequest("http://localhost/api/admin/x", {
      headers: { Authorization: "Bearer x" },
    });

    const res = await protectedRoute(req);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
