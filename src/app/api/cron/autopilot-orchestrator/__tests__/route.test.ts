/**
 * Autopilot Orchestrator (Task C2) — rute-test med mocked Supabase.
 *
 * Etter Task 1.1 (rewire til orchestrator-modulen) mockes
 * @/lib/trading/autopilot/orchestrator direkte: ruten kaller
 * processAutopilotUser(createAutopilotDb(supabase), userId) — all
 * Kraken/trading-logikk lever i modulen og testes der
 * (src/lib/trading/autopilot/__tests__/orchestrator.test.ts).
 *
 * Verifiserer:
 *  - 401 uten gyldig CRON_SECRET (samme mønster som tick)
 *  - 200 med processed/errors-tall når autopilot-brukere prosesseres
 *  - Wiring: createAutopilotDb får supabase-klienten, processAutopilotUser får (db, user_id)
 *  - drawdown-kill (killTriggered) → telles som feil med tydelig error
 *  - Feil for én bruker stopper IKKE andre (error_details per bruker)
 *  - Uventede kast fra processAutopilotUser fanges av try/catch-guarden
 *  - Tomt resultat → processed=0, errors=0
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoisted mocks — må defineres FØR vi.mock-kallene nedenfor
const dbContainer = vi.hoisted(() => ({ db: null as unknown }));
const processUserMock = vi.hoisted(() => vi.fn());
const createAutopilotDbMock = vi.hoisted(() => vi.fn());
const captureSuccessMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => dbContainer.db),
}));

// Orchestrator-modulen er mocket: all Kraken/trading-logikk testes i
// orchestrator.test.ts — ruten skal kun verifisere wiring, resultat-
// håndtering og feilisolering.
vi.mock("@/lib/trading/autopilot/orchestrator", () => ({
  processAutopilotUser: processUserMock,
  createAutopilotDb: createAutopilotDbMock,
}));

vi.mock("@/lib/cron/cron-helpers", () => ({
  captureCronSuccess: captureSuccessMock,
  captureCronError: captureErrorMock,
}));

// Må settes før route-importen (validateCronSecret leser den ved kjøring)
process.env.CRON_SECRET = "test-secret";

import { POST } from "../route";

/** Suksess-resultat slik orchestrator-modulen returnerer det (AutopilotSuccess). */
function successResult(
  userId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ok: true,
    userId,
    firstRun: true,
    portfolio: { equityUsdc: 500, freeUsdc: 400, positions: [] },
    allocation: [],
    drawdown: { shouldKill: false, levelSizeMultiplier: 1 },
    killTriggered: false,
    killed: false,
    cancelledOrders: 0,
    fills: 0,
    realizedProfitUsdc: 0,
    reinvestedUsdc: 0,
    idleLevelsPlaced: 0,
    newOrdersPlaced: 0,
    fivePairActivated: false,
    ...overrides,
  };
}

/** Bygger en mock-Supabase for fetchAutopilotUsers (to spørringer + intersection). */
function createMockDb(options: {
  keys: Array<{
    user_id: string;
    api_key_encrypted: string;
    api_secret_encrypted: string;
  }>;
  activated: string[];
}) {
  const { keys, activated } = options;

  const keysChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: keys, error: null }),
  };

  const stateChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: activated.map((id) => ({ user_id: id })),
      error: null,
    }),
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
  return new NextRequest("http://localhost/api/cron/autopilot-orchestrator", {
    method: "POST",
    headers,
  });
}

describe("POST /api/cron/autopilot-orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAutopilotDbMock.mockImplementation((supabase: unknown) => ({
      supabase,
    }));
  });

  it("returnerer 401 uten gyldig CRON_SECRET", async () => {
    dbContainer.db = createMockDb({ keys: [], activated: [] });

    const res = await POST(autopilotRequest("feil-secret"));
    expect(res.status).toBe(401);

    const res2 = await POST(autopilotRequest(null));
    expect(res2.status).toBe(401);

    expect(processUserMock).not.toHaveBeenCalled();
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
    processUserMock.mockResolvedValue(successResult("user-1"));

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.error_details).toEqual([]);
    expect(body.total_users).toBe(1);

    // Wiring: createAutopilotDb får supabase-klienten, processAutopilotUser får (db, user_id)
    expect(createAutopilotDbMock).toHaveBeenCalledWith(dbContainer.db);
    const autopilotDb = createAutopilotDbMock.mock.results[0].value;
    expect(processUserMock).toHaveBeenCalledWith(autopilotDb, "user-1");
    expect(body.error_details).toEqual([]);
  });

  it("markerer drawdown-kill som feil med tydelig error", async () => {
    dbContainer.db = createMockDb({
      keys: [
        {
          user_id: "user-kill",
          api_key_encrypted: "enc-key",
          api_secret_encrypted: "enc-secret",
        },
      ],
      activated: ["user-kill"],
    });
    processUserMock.mockResolvedValue(
      successResult("user-kill", { killTriggered: true, killed: true }),
    );

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(0);
    expect(body.errors).toBe(1);
    expect(body.error_details).toEqual([
      { user_id: "user-kill", error: "drawdown-kill aktiv" },
    ]);
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

    // user-ok suksess; user-fail returnerer failure-resultat fra modulen
    processUserMock
      .mockResolvedValueOnce(successResult("user-ok"))
      .mockResolvedValueOnce({
        ok: false,
        userId: "user-fail",
        error: "Kraken API error: EAPI:Invalid key",
      });

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.error_details).toHaveLength(1);
    expect(body.error_details[0].user_id).toBe("user-fail");
    expect(body.error_details[0].error).toContain("Kraken API error");
  });

  it("fanger uventede kast fra processAutopilotUser (try/catch-guard)", async () => {
    dbContainer.db = createMockDb({
      keys: [
        {
          user_id: "user-throw",
          api_key_encrypted: "enc-key",
          api_secret_encrypted: "enc-secret",
        },
      ],
      activated: ["user-throw"],
    });
    processUserMock.mockRejectedValue(new Error("boom"));

    const res = await POST(autopilotRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.processed).toBe(0);
    expect(body.errors).toBe(1);
    expect(body.error_details).toEqual([
      { user_id: "user-throw", error: "boom" },
    ]);
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
    expect(processUserMock).not.toHaveBeenCalled();
  });
});
