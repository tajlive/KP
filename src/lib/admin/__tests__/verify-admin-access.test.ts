import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/admin/admin-allowlist.server", () => ({
  isEmailOnServerAdminAllowlist: vi.fn(),
}));

import { isEmailOnServerAdminAllowlist } from "@/lib/admin/admin-allowlist.server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";

describe("verifyAdminAccess", () => {
  afterEach(() => {
    vi.mocked(createServerClient).mockReset();
    vi.mocked(isEmailOnServerAdminAllowlist).mockReset();
  });

  it("returns 401 when there is no user", async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
      from: vi.fn(),
    } as never);

    const r = await verifyAdminAccess();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("allows allowlisted email without admin role", async () => {
    vi.mocked(isEmailOnServerAdminAllowlist).mockReturnValue(true);
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: async () => ({ data: { role: "user" } }),
        }),
      }),
    });
    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "ops@example.com" } },
        }),
      },
      from,
    } as never);

    const r = await verifyAdminAccess();
    expect(r.ok).toBe(true);
  });

  it("returns 403 when not allowlisted and role is not admin", async () => {
    vi.mocked(isEmailOnServerAdminAllowlist).mockReturnValue(false);
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: async () => ({ data: { role: "user" } }),
        }),
      }),
    });
    vi.mocked(createServerClient).mockResolvedValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "x@y.z" } },
        }),
      },
      from,
    } as never);

    const r = await verifyAdminAccess();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
});
