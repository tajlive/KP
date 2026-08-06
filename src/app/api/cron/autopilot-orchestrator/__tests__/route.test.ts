/**
 * Autopilot Orchestrator (Task C2) — rute-test med mocked Supabase.
 *
 * Verifiserer:
 *  - 401 uten gyldig CRON_SECRET (samme mønster som tick)
 *  - 200 med processed/errors-tall når autopilot-brukere prosesseres
 *  - Feil for én bruker stopper IKKE andre (error_details per bruker)
 *  - Tomt resultat → processed=0, errors=0
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks — må defineres FØR vi.mock-kallene nedenfor
const dbContainer = vi.hoisted(() => ({ db: null as unknown }));
const getBalanceMock = vi.hoisted(() => vi.fn());
const getTickerMock = vi.hoisted(() => vi.fn());
const decryptMock = vi.hoisted(() => vi.fn());
const captureSuccessMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => dbContainer.db),
}));

vi.mock("@/lib/crypto/encrypt-api-keys", () => ({
  decryptApiKey: (...args: unknown[]) => decryptMock(...args),
}));

vi.mock("@/lib/exchanges/kraken/client", () => {
  class MockKrakenClient {
    getBalance = getBalanceMock;
    getTicker = getTickerMock;
  }
  return { KrakenClient: MockKrakenClient };
});

vi.mock("@/lib/cron/cron-helpers", () => ({
  captureCronSuccess: captureSuccessMock,
  captureCronError: captureErrorMock,
}));

// Må settes før route-importen (validateCronSecret leser den ved kjøring)
process.env.CRON_SECRET = "test-secret";

import { POST } from "../route";

/** Bygger en mock-Supabase: brukere (nøkler), aktiverte brukere, prev-state. */
function createMockDb(options: {
  keys: Array<{
    user_id: string;
    api_key_encrypted: string;
    api_secret_encrypted: string;
  }>;
  activated: string[];
  prevState?: Record<string, unknown>;
}) {
  const { keys, activated, prevState } = options;

  const keysChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: keys, error: null }),
  };

  const stateChain = {
    select: vi.fn((cols: string) => {
      if (cols === "user_id") {
        // fetchAutopilotUsers: .eq("activated", true) → alle aktiverte
        return {
          eq: vi.fn().mockResolvedValue({
            data: activated.map((id) => ({ user_id: id })),
            error: null,
          }),
        };
      }
      // processAutopilotUser: .eq("user_id", x).maybeSingle() → prev-state
      return {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: prevState ?? null,
          error: null,
        }),
      };
    }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    from: vi.fn((table: string) =>
      table === "user_kraken_keys" ? keysChain : stateChain,
    ),
  };
}

function autopilotRequest(secret: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (secret !== null) {
    headers.authorization = `Bearer ${secret}`;
  }
  return new NextRequest(
    "http://localhost/api/cron/autopilot-orchestrator",
    { method: "POST", headers },
  );
}

describe("POST /api/cron/autopilot-orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decryptMock.mockResolvedValue("decrypted-key");
    getBalanceMock.mockResolvedValue({ USDC: "500", XXBT: "0.01" });
    getTickerMock.mockResolvedValue({ c: ["60000", "60000"] });
  });

  it("returnerer 401 uten gyldig CRON_SECRET", async () => {
    dbContainer.db = createMockDb({ keys: [], activated: [] });

    const res = await POST(autopilotRequest("feil-secret"));
    expect(res.status).toBe(401);

    const res2 = await POST(autopilotRequest(null));
    expect(res2.status).toBe(401);
  });

  it("returnerer 200 med processed=1, errors=0 for én autopilot-bruker", async () => {
    dbContainer.db = createMockDb({
      keys: [
        {
          user_id: "user-1",
          api_key_encrypted: "enc-key",
          api_secret_encrypted: "enc-secret",
        },
      ],
      activated: ["user-1"],
    });

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.error_details).toEqual([]);
    expect(body.total_users).toBe(1);

    // Kraken-nøklene må dekrypteres (aldri brukes i klartekst fra DB)
    expect(decryptMock).toHaveBeenCalledWith("enc-key");
    expect(decryptMock).toHaveBeenCalledWith("enc-secret");

    // autopilot_state oppdateres med equity + allokering
    const upsert = (dbContainer.db as { from: ReturnType<typeof vi.fn> }).from
      .mock.results.find((r: { value: unknown }) => {
        const chain = r.value as { upsert?: ReturnType<typeof vi.fn> };
        return chain && typeof chain.upsert === "function";
      })
      ?.value as { upsert: ReturnType<typeof vi.fn> };
    expect(upsert.upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: "user_id" });
    expect(row.user_id).toBe("user-1");
    expect(row.current_equity_usdc).toBeGreaterThan(0);
    expect(row.last_run).toBeDefined();
  });

  it("isolerer feil: én bruker feiler, de andre prosesseres", async () => {
    dbContainer.db = createMockDb({
      keys: [
        {
          user_id: "user-ok",
          api_key_encrypted: "enc-key-1",
          api_secret_encrypted: "enc-secret-1",
        },
        {
          user_id: "user-fail",
          api_key_encrypted: "enc-key-2",
          api_secret_encrypted: "enc-secret-2",
        },
      ],
      activated: ["user-ok", "user-fail"],
    });

    // user-ok får balanse, user-fail kaster → feilen må ikke stoppe user-ok
    getBalanceMock
      .mockResolvedValueOnce({ USDC: "500", XXBT: "0.01" })
      .mockRejectedValueOnce(new Error("Kraken API error: EAPI:Invalid key"));

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.error_details).toHaveLength(1);
    expect(body.error_details[0].user_id).toBe("user-fail");
    expect(body.error_details[0].error).toContain("Kraken API error");
  });

  it("returnerer processed=0, errors=0 når ingen autopilot-brukere finnes", async () => {
    // Aktive Kraken-nøkler finnes, men ingen autopilot er aktivert
    dbContainer.db = createMockDb({
      keys: [
        {
          user_id: "user-inactive",
          api_key_encrypted: "enc-key",
          api_secret_encrypted: "enc-secret",
        },
      ],
      activated: [], // autopilot_state.activated=true → ingen
    });

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(0);
    expect(body.errors).toBe(0);
    expect(body.error_details).toEqual([]);
  });
});
