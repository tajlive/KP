/**
 * P0-2-tester (2026-08-06): tick-ruta må stoppe ALL trading når
 * `global_settings.emergency_stop = true` (admin-dashboard / MCP
 * panic_close_all → activateEmergencyStop).
 *
 * Før fiksen hadde `emergency.ts` 0 kallere — nødbremsen stoppet IKKE
 * tick. Denne testen simulerer at bremsen er aktiv og verifiserer 503
 * + at ingen session-prosessering starter.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/tick/route";

const { validateCronSecretMock, createClientMock, captureCronErrorMock } =
  vi.hoisted(() => ({
    validateCronSecretMock: vi.fn(),
    createClientMock: vi.fn(),
    captureCronErrorMock: vi.fn(),
  }));

// Alle dypere avhengigheter (executor, idempotency, risk, currency) mockes
// vekk — de skal ALDRI berøres når emergency stop er aktiv.
vi.mock("@/lib/auth/cron", () => ({
  validateCronSecret: (...args: unknown[]) => validateCronSecretMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  logError: vi.fn(),
  withScope: vi.fn((cb: (scope: Record<string, unknown>) => void) =>
    cb({
      setTag: vi.fn(),
      setContext: vi.fn(),
      setExtra: vi.fn(),
    }),
  ),
}));

vi.mock("@/lib/cron/cron-helpers", () => ({
  captureCronError: (...args: unknown[]) => captureCronErrorMock(...args),
  captureCronSuccess: vi.fn(),
  generateTradeIdempotencyKey: vi.fn().mockReturnValue("key"),
}));

vi.mock("@/lib/trading/executor-factory", () => ({
  ExecutorFactory: {
    create: vi.fn().mockResolvedValue({}),
    canTradeLive: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("@/lib/trading/idempotency", () => ({
  makeIdempotencyKey: vi.fn().mockReturnValue("key"),
  withIdempotency: vi.fn((_db, _key, _scope, _hash, operation) => operation()),
}));

vi.mock("@/lib/trading/safety/risk-validator", () => ({
  validateTradeAgainstRiskProfile: vi.fn().mockResolvedValue({ allowed: true }),
  recordTradeRejection: vi.fn().mockResolvedValue(undefined),
  recordTradeDecision: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/trading/currency", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/trading/currency")>();
  return {
    ...actual,
    getUsdtToNokRateAsync: vi.fn().mockResolvedValue(11),
    usdtToNok: vi.fn((amount: number, rate?: number) => amount * (rate ?? 11)),
  };
});

vi.mock("@/lib/trading/core/distributed-lock", () => ({
  acquireTradeLock: vi.fn().mockResolvedValue({
    acquired: true,
    release: vi.fn().mockResolvedValue(undefined),
  }),
}));

// getFlagsAsync — vi ønsker signalEngineKillSwitch=false, så kun
// emergency_stop-grenen testes isolert.
vi.mock("@/lib/flags", () => ({
  getFlagsAsync: vi.fn().mockResolvedValue({
    darkFleetPhase1: false,
    darkFleetKillSwitch: false,
    signalEngineKillSwitch: false,
    tradingV3: true,
    rlSignals: false,
    euTaxReport: false,
    betaTrading: true,
    whitelabelFees: false,
    maintenanceMode: false,
    sonarUi: false,
    aiInsight: true,
  }),
}));

function createEmergencyStopDb() {
  return {
    from: vi.fn((table: string) => {
      if (table === "global_settings") {
        return {
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                emergency_stop: true,
                emergency_reason: "test_panic",
                emergency_triggered_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        };
      }
      // Alt annet skal aldri nås — kast hvis det skjer.
      return {
        select: vi.fn().mockImplementation(() => {
          throw new Error(`Unexpected table access: ${table}`);
        }),
      };
    }),
  };
}

function makeRequest(): NextRequest {
  return new NextRequest("https://www.klarpakke.no/api/cron/tick", {
    headers: { authorization: "Bearer test-secret" },
  });
}

describe("tick P0-2: global_settings.emergency_stop", () => {
  beforeEach(() => {
    validateCronSecretMock.mockReset();
    validateCronSecretMock.mockReturnValue(true);
    createClientMock.mockReset();
    captureCronErrorMock.mockReset();
    createClientMock.mockResolvedValue(createEmergencyStopDb());
  });

  it("returnerer 503 og prosesserer INGEN sesjoner når emergency_stop=true", async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Trading halted");
    expect(body.reason).toBe("Emergency stop active");

    // Bremsen logges i Sentry
    expect(captureCronErrorMock).toHaveBeenCalledWith(
      "tick",
      expect.any(Error),
      { reason: "test_panic" },
    );
  });

  it("berører kun global_settings-tabellen (ingen trading_sessions/positions/trades)", async () => {
    const db = createEmergencyStopDb();
    createClientMock.mockResolvedValue(db);
    await GET(makeRequest());

    const touchedTables = db.from.mock.calls.map((c) => c[0]);
    expect(touchedTables).toEqual(["global_settings"]);
  });
});
