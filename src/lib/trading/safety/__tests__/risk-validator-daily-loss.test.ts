/**
 * P0-3-tester (2026-08-06): risk-validator-adapteren skal lese
 * `auto_trade_settings.daily_loss_limit_percent` når brukeren mangler
 * aktiv risk-profil (paper), slik at den daglige tapsgrensen faktisk
 * trigges — i stedet for demo-default 100 % som aldri stopper handel.
 *
 * Prod-data ved fikstidspunkt: 22/24 brukere har grense=5 satt, ingen
 * aktiv profil → grensen ble aldri håndhevet.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateTradeAgainstRiskProfile } from "@/lib/trading/safety/risk-validator";

const { checkTradeRiskMock } = vi.hoisted(() => ({
  checkTradeRiskMock: vi.fn(),
}));

vi.mock("@/lib/trading/canonical/risk", () => ({
  checkTradeRisk: (...args: unknown[]) => checkTradeRiskMock(...args),
}));

vi.mock("@/lib/trading/currency", () => ({
  getUsdtToNokRateAsync: vi.fn().mockResolvedValue(11),
  usdtToNok: vi.fn((usdt: number, rate?: number) => usdt * (rate ?? 11)),
}));

function createMockSupabase(
  overrides: {
    session?: Record<string, unknown> | null;
    riskProfile?: Record<string, unknown> | null;
    autoSetting?: { daily_loss_limit_percent?: number | null } | null;
  } = {},
): SupabaseClient {
  const {
    session = {
      id: "session-1",
      user_id: "user-1",
      mode: "paper",
      status: "active",
      current_capital_nok: 1_000_000,
      starting_capital_nok: 1_000_000,
    },
    riskProfile = null,
    autoSetting = { daily_loss_limit_percent: 5 },
  } = overrides;

  const select = vi.fn((columns: string) => {
    if (columns.includes("daily_loss_limit_percent")) {
      return {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: autoSetting,
            error: null,
          }),
        }),
      };
    }
    if (columns.includes("max_position_pct")) {
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: riskProfile,
              error: null,
            }),
          }),
        }),
      };
    }
    // trading_sessions
    return {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: session,
            error: null,
          }),
        }),
      }),
    };
  });

  return {
    from: vi.fn(() => ({ select })),
  } as unknown as SupabaseClient;
}

const baseTrade = {
  userId: "user-1",
  sessionId: "session-1",
  symbol: "BTCUSDT",
  side: "buy" as const,
  quantity: 0.1,
  price: 500_000,
  orderType: "market" as const,
  tradingMode: "paper" as const,
};

describe("risk-validator P0-3: auto_trade_settings daily-loss-override", () => {
  beforeEach(() => {
    checkTradeRiskMock.mockReset();
    checkTradeRiskMock.mockResolvedValue({ allowed: true });
  });

  it("sender dailyLossPctOverride=5 når brukeren har auto_trade_settings men ingen aktiv profil", async () => {
    const supabase = createMockSupabase();
    const result = await validateTradeAgainstRiskProfile(supabase, baseTrade);

    expect(result.allowed).toBe(true);
    expect(checkTradeRiskMock).toHaveBeenCalledTimes(1);
    const options = checkTradeRiskMock.mock.calls[0][4];
    expect(options.dailyLossPctOverride).toBe(5);
  });

  it("sender ingen override når brukeren har aktiv risk-profil (profilen styrer)", async () => {
    const supabase = createMockSupabase({
      riskProfile: {
        id: "profile-1",
        name: "Test",
        max_position_pct: 100,
        max_exposure_pct: 100,
        max_daily_loss_pct: 2,
        allowed_pairs: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
        leverage_allowed: false,
      },
    });
    const result = await validateTradeAgainstRiskProfile(supabase, baseTrade);

    expect(result.allowed).toBe(true);
    const options = checkTradeRiskMock.mock.calls[0][4];
    expect(options.dailyLossPctOverride).toBeUndefined();
  });

  it("sender ingen override når auto_trade_settings mangler grense (fallback demo-default 100%)", async () => {
    const supabase = createMockSupabase({
      autoSetting: { daily_loss_limit_percent: null },
    });
    const result = await validateTradeAgainstRiskProfile(supabase, baseTrade);

    expect(result.allowed).toBe(true);
    const options = checkTradeRiskMock.mock.calls[0][4];
    expect(options.dailyLossPctOverride).toBeUndefined();
  });

  it("P0-3-regresjon: når grensen trigges (dailyLoss=60k, capital=1M, grense=5%) blokkeres trade", async () => {
    checkTradeRiskMock.mockResolvedValue({
      allowed: false,
      rejectionReason: "DAILY_LOSS_LIMIT_EXCEEDED",
      rejectionDetails: {
        maxAllowed: 5,
        currentDailyLoss: 6,
        projectedLoss: 6,
      },
      dailyLossPct: 6,
    });
    const supabase = createMockSupabase();
    const result = await validateTradeAgainstRiskProfile(supabase, baseTrade);

    expect(result.allowed).toBe(false);
    expect(result.rejectionReason).toBe("DAILY_LOSS_LIMIT_EXCEEDED");
    expect(checkTradeRiskMock).toHaveBeenCalledTimes(1);
  });
});
